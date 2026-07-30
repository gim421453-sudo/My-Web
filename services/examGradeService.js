/*
 * Pure Batch 10C calculations. This service has no Firebase imports, writes,
 * listeners, or identifiers in diagnostics; app.js owns the gated persistence.
 */
(function installExamGradeService(scope) {
  const SCORE_SOURCES = new Set(["rawScore", "percentage", "weightedScore", "subjectTermTotal", "customCalculatedScore", "raw_score", "weighted_score", "course_total"]);
  const SCORE_SOURCE_FIELDS = Object.freeze({ raw_score: "rawScore", weighted_score: "weightedScore", course_total: "subjectTermTotal" });
  const TIE_POLICIES = new Set(["competition", "dense"]);
  const GRADE_POLICIES = new Set(["official-five-grade", "custom-relative-grade", "absolute-grade", "manual-grade", "disabled"]);

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function round(value, mode = "preserve", digits = 2) {
    const input = number(value);
    if (input === null) return null;
    const scale = 10 ** Math.max(0, Math.min(6, Number(digits) || 0));
    if (mode === "floor") return Math.floor(input * scale) / scale;
    if (mode === "ceil") return Math.ceil(input * scale) / scale;
    if (mode === "round") return Math.round(input * scale) / scale;
    return input;
  }

  function validateScore(rawScore, maxScore) {
    const raw = number(rawScore);
    const max = number(maxScore);
    if (raw === null || max === null || max <= 0) return { ok: false, code: "score-invalid" };
    if (raw < 0) return { ok: false, code: "score-negative" };
    if (raw > max) return { ok: false, code: "score-exceeds-max" };
    return { ok: true, rawScore: raw, maxScore: max };
  }

  function calculateAssessmentScore(row = {}, options = {}) {
    const status = String(row.attendanceStatus || row.submissionStatus || "").trim();
    if (["absent", "not-attended", "exempt", "invalid"].includes(status)) {
      return { status: "excluded", rawScore: null, percentage: null, weightedScore: null };
    }
    const valid = validateScore(row.rawScore, row.maxScore);
    if (!valid.ok) return { status: "invalid", code: valid.code, rawScore: null, percentage: null, weightedScore: null };
    const weight = number(row.weight ?? options.weight ?? 0) ?? 0;
    const percentage = (valid.rawScore / valid.maxScore) * 100;
    return {
      status: "included",
      rawScore: valid.rawScore,
      maxScore: valid.maxScore,
      percentage,
      weightedScore: (percentage * weight) / 100,
      displayPercentage: round(percentage, options.roundingPolicy, options.decimals),
      displayWeightedScore: round((percentage * weight) / 100, options.roundingPolicy, options.decimals)
    };
  }

  function calculateSubjectTermTotals(results = []) {
    const groups = new Map();
    results.forEach((row) => {
      if (!row || row.included === false) return;
      const score = calculateAssessmentScore(row, row);
      if (score.status !== "included") return;
      const key = [row.studentId, row.academicYear, row.gradeLevel, row.term, row.classId || row.cohortId, row.subjectId].map((item) => String(item || "")).join("|");
      const current = groups.get(key) || { studentId: row.studentId || "", subjectId: row.subjectId || "", academicYear: row.academicYear || "", gradeLevel: row.gradeLevel || "", term: row.term || "", classId: row.classId || row.cohortId || "", subjectTermTotal: 0, assessmentCount: 0 };
      current.subjectTermTotal += score.weightedScore;
      current.assessmentCount += 1;
      groups.set(key, current);
    });
    return [...groups.values()];
  }

  function calculateRanks(rows = [], tiePolicy = "competition") {
    const policy = TIE_POLICIES.has(tiePolicy) ? tiePolicy : "competition";
    const included = rows
      .filter((row) => row && row.score !== null && row.score !== undefined && row.eligible !== false)
      .map((row) => ({ ...row, score: Number(row.score) }))
      .filter((row) => Number.isFinite(row.score))
      .sort((left, right) => right.score - left.score);
    let previousScore = null;
    let rank = 0;
    let denseRank = 0;
    return included.map((row, index) => {
      if (previousScore === null || row.score !== previousScore) {
        denseRank += 1;
        rank = index + 1;
      }
      previousScore = row.score;
      const resolvedRank = policy === "dense" ? denseRank : rank;
      return { ...row, rank: resolvedRank, tiedRank: resolvedRank, participantCount: included.length, rankPercent: included.length ? (resolvedRank / included.length) * 100 : null };
    });
  }

  function calculateStatistics(rows = []) {
    const scores = rows.map((row) => number(row.score)).filter((value) => value !== null);
    const sorted = [...scores].sort((a, b) => a - b);
    const count = sorted.length;
    const average = count ? sorted.reduce((sum, value) => sum + value, 0) / count : null;
    const median = !count ? null : count % 2 ? sorted[Math.floor(count / 2)] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
    const variance = count && average !== null ? sorted.reduce((sum, value) => sum + ((value - average) ** 2), 0) / count : null;
    return { participantCount: count, average, median, standardDeviation: variance === null ? null : Math.sqrt(variance), highest: count ? sorted[count - 1] : null, lowest: count ? sorted[0] : null };
  }

  function validateAchievementPolicy(policy = {}) {
    const name = String(policy.name || "").trim();
    const source = String(policy.scoreSource || "");
    const thresholds = Array.isArray(policy.thresholds) ? policy.thresholds.map((item) => ({ ...item, label: String(item.label || "").trim(), minimumScore: item.minimumScore === null || item.minimumScore === "" ? null : number(item.minimumScore) })) : [];
    if (!name) return { ok: false, code: "achievement-policy-name-required" };
    if (!SCORE_SOURCES.has(source)) return { ok: false, code: "achievement-policy-score-source-invalid" };
    if (!thresholds.length) return { ok: false, code: "achievement-policy-thresholds-required" };
    const labels = new Set(); let fallbackCount = 0; const minimums = new Set(); let previous = Infinity;
    for (const threshold of thresholds.sort((left, right) => Number(left.order || 0) - Number(right.order || 0))) {
      if (!threshold.label || labels.has(threshold.label)) return { ok: false, code: "achievement-policy-label-duplicate" };
      labels.add(threshold.label);
      if (threshold.fallback === true || threshold.minimumScore === null) { fallbackCount += 1; continue; }
      if (threshold.minimumScore === null) return { ok: false, code: "achievement-policy-minimum-invalid" };
      if (minimums.has(threshold.minimumScore)) return { ok: false, code: "achievement-policy-minimum-duplicate" };
      if (threshold.minimumScore >= previous) return { ok: false, code: "achievement-policy-order-invalid" };
      minimums.add(threshold.minimumScore); previous = threshold.minimumScore;
    }
    if (fallbackCount !== 1) return { ok: false, code: "achievement-policy-fallback-invalid" };
    return { ok: true, policy: { ...policy, thresholds: thresholds.sort((left, right) => (right.minimumScore ?? -Infinity) - (left.minimumScore ?? -Infinity)) } };
  }

  function achievementScore(row = {}, scoreSource = "") {
    return number(row[SCORE_SOURCE_FIELDS[scoreSource] || scoreSource]);
  }

  function calculateAchievement(policy, row = {}) {
    const validated = validateAchievementPolicy(policy);
    if (!validated.ok) return { status: "invalid-policy", code: validated.code, calculatedAchievement: null };
    const sourceScore = achievementScore(row, validated.policy.scoreSource);
    if (sourceScore === null) return { status: "unassigned", calculatedAchievement: null, achievementSourceScore: null };
    const match = validated.policy.thresholds.find((threshold) => threshold.minimumScore !== null && sourceScore >= threshold.minimumScore) || validated.policy.thresholds.find((threshold) => threshold.fallback === true || threshold.minimumScore === null);
    return { status: "calculated", calculatedAchievement: match?.label || null, achievementPolicyId: String(validated.policy.id || ""), achievementPolicyVersion: Number(validated.policy.version || 1), achievementScoreSource: validated.policy.scoreSource, achievementSourceScore: sourceScore };
  }

  function previewAchievementPolicy(policy, rows = []) {
    const before = new Map(rows.map((row) => [String(row.id || row.studentId || ""), row.calculatedAchievement || null]));
    const calculated = rows.map((row) => ({ ...row, ...calculateAchievement(policy, row) }));
    const counts = {}; let changedCount = 0; let unassignedCount = 0;
    calculated.forEach((row) => { const label = row.calculatedAchievement || "미산정"; counts[label] = (counts[label] || 0) + 1; if (label === "미산정") unassignedCount += 1; if (before.get(String(row.id || row.studentId || "")) !== row.calculatedAchievement) changedCount += 1; });
    return { rows: calculated, counts, affectedCount: calculated.length, changedCount, unassignedCount };
  }

  function previewFiveGrade(rows = [], options = {}) {
    const ranked = calculateRanks(rows, options.tiePolicy || "competition");
    const policy = GRADE_POLICIES.has(options.gradePolicy || "official-five-grade") ? options.gradePolicy || "official-five-grade" : "official-five-grade";
    if (policy !== "official-five-grade") return { policy, rows: ranked.map((row) => ({ ...row, calculatedGrade: null })), requiresConfirmation: true };
    const limits = [0.10, 0.34, 0.66, 0.90, 1]; const count = ranked.length;
    return { policy, requiresConfirmation: true, rows: ranked.map((row) => {
      const ratio = count ? row.rank / count : 1;
      const index = limits.findIndex((limit) => ratio <= limit);
      return { ...row, calculatedGrade: index < 0 ? 5 : index + 1 };
    }), gradeEligibleCount: count };
  }

  function buildCsv(columns = [], rows = []) {
    // Prefix formula-looking values so spreadsheet applications do not execute
    // user-entered CSV cells as formulas on import.
    const escape = (value) => {
      const raw = String(value ?? "");
      const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    return [columns.map((column) => escape(column.label || column.key)).join(","), ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(","))].join("\r\n");
  }

  scope.PMExamGradeService = Object.freeze({ SCORE_SOURCES: [...SCORE_SOURCES], calculateAssessmentScore, calculateSubjectTermTotals, calculateRanks, calculateStatistics, validateAchievementPolicy, calculateAchievement, previewAchievementPolicy, previewFiveGrade, buildCsv, round });
})(typeof globalThis !== "undefined" ? globalThis : window);
