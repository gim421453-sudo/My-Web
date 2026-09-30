from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
LONG_NODE_EXE = r'"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"'
SHORT_NODE_EXE = r'"%NODE%"'

FONT_REGULAR = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
pdfmetrics.registerFont(TTFont("Malgun", FONT_REGULAR))
pdfmetrics.registerFont(TTFont("Malgun-Bold", FONT_BOLD))


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleKR",
            parent=base["Title"],
            fontName="Malgun-Bold",
            fontSize=22,
            leading=30,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleKR",
            fontName="Malgun",
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#64748b"),
            alignment=TA_CENTER,
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "Heading1KR",
            fontName="Malgun-Bold",
            fontSize=14,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=14,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Heading2KR",
            fontName="Malgun-Bold",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#1e40af"),
            spaceBefore=8,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "BodyKR",
            fontName="Malgun",
            fontSize=9.3,
            leading=14,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=5,
        ),
        "muted": ParagraphStyle(
            "MutedKR",
            fontName="Malgun",
            fontSize=8.5,
            leading=13,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=5,
        ),
        "note": ParagraphStyle(
            "NoteKR",
            fontName="Malgun",
            fontSize=8.8,
            leading=13,
            textColor=colors.HexColor("#374151"),
        ),
        "code": ParagraphStyle(
            "CodeKR",
            fontName="Malgun",
            fontSize=7.25,
            leading=10.6,
            textColor=colors.HexColor("#0f172a"),
            leftIndent=0,
            rightIndent=0,
            splitLongWords=True,
        ),
        "footer": ParagraphStyle(
            "FooterKR",
            fontName="Malgun",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#94a3b8"),
            alignment=TA_CENTER,
        ),
    }


S = styles()


def draw_page(canvas, doc, title):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#eff6ff"))
    canvas.rect(0, height - 16 * mm, width, 16 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#1d4ed8"))
    canvas.setFont("Malgun-Bold", 9)
    canvas.drawString(18 * mm, height - 10.5 * mm, title)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.setFont("Malgun", 8)
    canvas.drawRightString(width - 18 * mm, height - 10.5 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(colors.HexColor("#dbeafe"))
    canvas.line(18 * mm, height - 17 * mm, width - 18 * mm, height - 17 * mm)
    canvas.restoreState()


class NumberedCanvasDoc(BaseDocTemplate):
    def __init__(self, filename, title):
        self.report_title = title
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=24 * mm,
            bottomMargin=16 * mm,
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
        )
        self.addPageTemplates([
            PageTemplate(
                id="main",
                frames=[frame],
                onPage=lambda canvas, doc: draw_page(canvas, doc, self.report_title),
            )
        ])


def p(text, style="body"):
    return Paragraph(text, S[style])


def section(title):
    return p(title, "h1")


def subsection(title):
    return p(title, "h2")


def code_block(text):
    text = text.strip().replace(LONG_NODE_EXE, SHORT_NODE_EXE)
    wrapped_lines = []
    for line in text.splitlines():
        if len(line) <= 105:
            wrapped_lines.append(line)
            continue
        current = line
        while len(current) > 105:
            wrapped_lines.append(current[:105] + " ^")
            current = "  " + current[105:]
        if current:
            wrapped_lines.append(current)
    text = "\n".join(wrapped_lines)
    table = Table(
        [[Preformatted(text, S["code"])]],
        colWidths=["100%"],
        hAlign="LEFT",
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def note_box(text, tone="blue"):
    colors_by_tone = {
        "blue": ("#eff6ff", "#93c5fd"),
        "red": ("#fff1f2", "#fda4af"),
        "amber": ("#fffbeb", "#fbbf24"),
        "green": ("#ecfdf5", "#86efac"),
    }
    bg, border = colors_by_tone.get(tone, colors_by_tone["blue"])
    table = Table([[p(text, "note")]], colWidths=["100%"], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor(border)),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def checklist(items):
    story = []
    for item in items:
      story.append(p(f"- {item}", "body"))
    return story


def build_pdf(filename, title, subtitle, story_items):
    doc = NumberedCanvasDoc(str(OUT_DIR / filename), title)
    story = [
        Spacer(1, 8 * mm),
        Paragraph(title, S["title"]),
        Paragraph(subtitle, S["subtitle"]),
        note_box("이 문서는 개인 관리 웹앱 운영 중 자주 쓰는 명령어와 점검 절차를 빠르게 확인하기 위한 정리본입니다.", "blue"),
        Spacer(1, 6 * mm),
    ]
    story.extend(story_items)
    doc.build(story)
    return OUT_DIR / filename


def command_pdf():
    story = []
    story.append(section("기본 위치"))
    story.append(code_block(r'''
cd /d "C:\dev\My Web"
set "NODE=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
'''))
    story.append(note_box('이 PDF의 명령어는 긴 Node 경로를 줄이기 위해 "%NODE%" 변수를 사용합니다. 새 CMD 창을 열면 기본 위치 명령을 먼저 실행하세요.', "blue"))

    story.append(section("통합 사이트 실행"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
npm run dev
"""))
    story.append(p("접속 주소: http://127.0.0.1:5173/", "body"))
    story.append(subsection("npm이 안 될 때 대체 실행"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\generate-firebase-config.mjs
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173
"""))

    story.append(section("관리자 사이트 실행"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
set PM_STATIC_PREVIEW_PORT=5181
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\static-preview.cjs
"""))
    story.append(p("접속 주소: http://127.0.0.1:5181/", "body"))
    story.append(p("관리자 모드 확인 주소: http://127.0.0.1:5181/pm-env.js?v=1", "body"))
    story.append(code_block('window.PM_APP_TARGET = "admin-standalone";'))

    story.append(section("서버 종료와 포트 정리"))
    story.append(p("서버가 켜진 CMD 창에서 Ctrl + C를 누르면 종료됩니다. 포트가 계속 사용 중이면 PID를 확인해 강제 종료합니다.", "body"))
    story.append(code_block(r"""
netstat -ano | findstr :5173
netstat -ano | findstr :5181
taskkill /PID PID번호 /F
"""))

    story.append(section("서버 재시작"))
    story.append(subsection("통합 서버"))
    story.append(code_block(r"""
netstat -ano | findstr :5173
taskkill /PID PID번호 /F
cd /d "C:\dev\My Web"
npm run dev
"""))
    story.append(subsection("관리자 서버"))
    story.append(code_block(r"""
netstat -ano | findstr :5181
taskkill /PID PID번호 /F
cd /d "C:\dev\My Web"
set PM_STATIC_PREVIEW_PORT=5181
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\static-preview.cjs
"""))

    story.append(section("Firebase 설정 파일 다시 생성"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\generate-firebase-config.mjs
findstr PM_APP_TARGET pm-env.js
findstr PM_APP_TARGET dist-admin\pm-env.js
"""))

    story.append(section("통합 사이트 빌드"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\generate-firebase-config.mjs
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\typescript\bin\tsc --noEmit
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\vite\bin\vite.js build
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\copy-static-assets.mjs dist
"""))

    story.append(section("관리자 사이트 빌드"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
set VITE_APP_TARGET=admin-standalone
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\generate-firebase-config.mjs
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\typescript\bin\tsc --noEmit
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\vite\bin\vite.js build --outDir dist-admin
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\copy-static-assets.mjs dist-admin
set VITE_APP_TARGET=
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\generate-firebase-config.mjs
"""))
    story.append(note_box("마지막 generate-firebase-config 명령은 루트 개발 서버를 다시 main 모드로 돌리는 용도입니다.", "amber"))

    story.append(section("코드 문법 점검"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check app.js
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check services\authService.js
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check services\systemAdminService.js
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check scripts\static-preview.cjs
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" node_modules\typescript\bin\tsc --noEmit
"""))

    story.append(section("시스템 오너 지정"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\set-system-owner.mjs --email 본인이메일@example.com
"""))
    story.append(subsection("워크스페이스 이름 지정"))
    story.append(code_block(r"""
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\set-system-owner.mjs --email 본인이메일@example.com --workspace-name "내 관리 워크스페이스"
"""))

    story.append(section("오너 제외 회원 초기화"))
    story.append(note_box("오너 계정은 남기고 나머지 Auth 계정/회원 문서를 삭제합니다. 업무 데이터는 최대한 남기는 스크립트입니다.", "red"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\delete-non-owner-accounts.mjs --owner-email 본인이메일@example.com
"""))
    story.append(p("실행 중 아래 문구를 정확히 입력해야 삭제됩니다.", "body"))
    story.append(code_block("CONFIRM_DELETE_NON_OWNER_ACCOUNTS"))

    story.append(section("전체 테스트 데이터 초기화"))
    story.append(note_box("주의: Auth 전체 사용자, Firestore users, workspaces 컬렉션 문서를 삭제하는 테스트용 초기화입니다.", "red"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
"C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\reset-firebase-test-data.mjs
"""))
    story.append(p("실행 중 아래 문구를 정확히 입력해야 삭제됩니다.", "body"))
    story.append(code_block("CONFIRM_RESET"))

    story.append(section("Firestore Rules"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
notepad firestore.rules
"""))
    story.append(p("Firebase Console에서 붙여넣고 게시합니다. Firebase CLI가 있으면 아래 명령으로 배포할 수 있습니다.", "body"))
    story.append(code_block("firebase deploy --only firestore:rules"))

    story.append(section("버전과 모드 확인"))
    story.append(code_block(r"""
cd /d "C:\dev\My Web"
findstr "authService.js?v= systemAdminService.js?v= app.js?v=" index.html
findstr "authService.js?v= systemAdminService.js?v= app.js?v=" dist-admin\index.html
findstr PM_APP_TARGET pm-env.js
findstr PM_APP_TARGET dist\pm-env.js
findstr PM_APP_TARGET dist-admin\pm-env.js
"""))

    story.append(section("브라우저 열기"))
    story.append(code_block(r"""
start http://127.0.0.1:5173/
start http://127.0.0.1:5181/
start http://127.0.0.1:5181/pm-env.js?v=1
"""))

    return build_pdf(
        "cmd-commands-reference.pdf",
        "CMD 명령어 정리",
        "개인 관리 웹앱 운영/빌드/초기화/관리자 서버 실행 명령어 모음",
        story,
    )


def checklist_pdf():
    story = []
    story.append(section("먼저 확인할 5가지"))
    story.extend(checklist([
        "5173 통합 사이트 로그인 후 일반 통합 대시보드가 정상 표시되는지 확인",
        "5181 관리자 사이트 로그인 후 시스템 관리자 화면이 정상 표시되는지 확인",
        "5181 권한 점검/복구에서 모든 계정 상태가 정상으로 유지되는지 확인",
        "5173과 5181에서 계정/권한 변경이 서로 반영되는지 확인",
        "브라우저를 껐다 켜도 5181이 로그인 없이 바로 관리자 화면으로 들어가지 않는지 확인",
    ]))

    story.append(section("로그인/접근"))
    story.extend(checklist([
        "로그아웃 후 5173 접속 시 로그인 화면이 먼저 뜨는지 확인",
        "로그아웃 후 5181 접속 시 관리자 화면으로 바로 들어가지 않는지 확인",
        "일반 계정으로 로그인했을 때 시스템 관리자 화면이 숨겨지는지 확인",
        "시스템 오너 계정으로 로그인했을 때 시스템 관리자 버튼이 보이는지 확인",
        "새로고침 후에도 권한과 메뉴 표시가 유지되는지 확인",
    ]))

    story.append(section("시스템 오너/워크스페이스"))
    story.extend(checklist([
        "시스템 오너 계정에서 내 워크스페이스 또는 통합 대시보드로 정상 이동되는지 확인",
        "시스템 관리자 화면에서 다시 관리 화면으로 돌아갈 수 있는지 확인",
        "시스템 오너도 자기 워크스페이스에서는 super_manager처럼 사이드탭이 보이는지 확인",
        "권한 점검/복구에서 root 미확인, nested 미확인, members 누락이 다시 뜨지 않는지 확인",
    ]))

    story.append(section("회원/권한 관리"))
    story.extend(checklist([
        "super_manager, manager, teacher, normal, viewer, print_account 역할 변경 후 새로고침해도 유지되는지 확인",
        "역할 변경 후 사이드탭 메뉴가 역할에 맞게 바뀌는지 확인",
        "일반 사용자가 관리자/친구관리/벌점 민감 메뉴를 볼 수 없는지 확인",
        "프린트 계정은 프린트 관련 메뉴만 보이는지 확인",
        "회원 비활성화 시 로그인 차단되는지 확인",
        "회원 삭제/비활성 처리 후 목록과 권한 상태가 맞는지 확인",
    ]))

    story.append(section("초대/가입"))
    story.extend(checklist([
        "시스템 오너 또는 관리자가 초대코드를 생성할 수 있는지 확인",
        "일반 계정이 초대코드 입력 후 같은 workspace로 들어오는지 확인",
        "초대받은 사용자가 사용자 관리 목록에 바로 보이는지 확인",
        "초대받은 사용자의 기본 역할이 normal인지 확인",
        "이미 연결된 계정이 다른 초대코드를 입력할 때 확인 절차가 나오는지 확인",
    ]))

    story.append(section("실시간 동기화"))
    story.extend(checklist([
        "계정 A에서 공지 추가 후 계정 B 화면에 바로 뜨는지 확인",
        "계정 A에서 일정/과제/시험/출결 추가 후 같은 workspace 계정에 바로 뜨는지 확인",
        "새로고침 없이 변경사항이 반영되는지 확인",
        "로그아웃/재로그인해야만 보이는 항목이 남아있는지 확인",
        "서로 다른 workspace 계정에는 데이터가 보이지 않는지 확인",
    ]))

    story.append(section("주요 기능"))
    story.extend(checklist([
        "메인 대시보드 빠른등록 후 현재 대시보드에 그대로 있는지 확인",
        "빠른등록으로 공지/일정/과제/시험 추가 시 실제 목록에 저장되는지 확인",
        "대시보드 카드의 더보기 버튼이 해당 탭으로 이동하는지 확인",
        "대시보드 항목 클릭 시 수정 버튼 없이 뷰어처럼 내용만 보이는지 확인",
        "출결, 일정, 공지, 과제, 시험, 포트폴리오 입력/수정/삭제가 정상인지 확인",
    ]))

    story.append(section("시간표/수업"))
    story.extend(checklist([
        "시간표 이름 생성/수정/삭제가 되는지 확인",
        "교시별 시간 변경이 저장되는지 확인",
        "시간표 일괄 삭제/추가가 정상인지 확인",
        "빠른 시간표에 교시/시간/요일이 맞게 뜨는지 확인",
        "시간표 기반 수업기록 자동 생성이 되는지 확인",
        "일반 사용자도 허용된 수업기록 생성이 되는지 확인",
    ]))

    story.append(section("공지/학교자료"))
    story.extend(checklist([
        "일반 공지와 시스템 공지가 구분되는지 확인",
        "시스템 공지가 메인 대시보드 별도 영역에 표시되는지 확인",
        "공지 마감일 여부 선택 시 불필요면 날짜가 비는지 확인",
        "공지 과목 선택박스가 정상 작동하는지 확인",
        "학교공지/가정통신문 가져오기 또는 표시가 깨지지 않는지 확인",
    ]))

    story.append(section("급식/급식 신청"))
    story.extend(checklist([
        "급식 탭이 정상 표시되는지 확인",
        "급식 신청에서 석식/토요일 중식 날짜 선택이 되는지 확인",
        "단가 입력 시 선택 날짜 수와 총 금액이 계산되는지 확인",
        "저장 버튼으로 저장되는지 확인",
        "우측 하단 급식 플로팅 버튼이 로그인 화면에서는 안 뜨는지 확인",
    ]))

    story.append(section("프린트/다운로드"))
    story.extend(checklist([
        "프린트 계정에서 프린트 메뉴만 보이는지 확인",
        "성적표/보고서/공지/수업자료/학교공지/시스템공지/급식이 선택 다운로드되는지 확인",
        "보고서 형식이 깨지지 않는지 확인",
        "프린트 모드에서 우측 하단 플로팅 버튼과 버전정보가 숨겨지는지 확인",
        "엑셀 다운로드 파일명이 자동으로 구분되는지 확인",
    ]))

    story.append(section("UI/반응형"))
    story.extend(checklist([
        "PC에서 사이드바가 기본으로 보이는지 확인",
        "모바일 크기에서 사이드바가 햄버거/접힘 형태로 바뀌는지 확인",
        "전체 페이지에 불필요한 가로 스크롤이 생기지 않는지 확인",
        "표가 필요한 경우 표 안에서만 스크롤되는지 확인",
        "대시보드 카드가 화면 밖으로 잘리지 않는지 확인",
        "버튼/체크박스/입력칸 크기가 너무 크거나 작지 않은지 확인",
    ]))

    story.append(section("최종 확인"))
    story.extend(checklist([
        "브라우저 Console에 빨간 오류가 없는지 확인",
        "Firestore Rules 게시 후 권한 오류가 없는지 확인",
        "5173 통합 사이트와 5181 관리자 사이트가 서로 같은 데이터/권한 상태를 보는지 확인",
        "Ctrl + F5 후에도 정상인지 확인",
        "브라우저를 껐다 켜도 5181이 로그인 없이 바로 들어가지 않는지 확인",
    ]))

    story.append(note_box("전체 기능 테스트는 먼저 1~5번 기반 안정성 확인을 통과한 뒤 진행하는 것이 좋습니다.", "green"))
    return build_pdf(
        "test-checklist-reference.pdf",
        "점검 및 해야 할 일 정리",
        "개인 관리 웹앱 안정화 후 기능별 테스트 체크리스트",
        story,
    )


if __name__ == "__main__":
    generated = [command_pdf(), checklist_pdf()]
    for path in generated:
        print(path)
