import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import type { AuthRepository } from "../authRepository";
import {
  readLegacySessionSnapshot,
  runShadowSessionComparison,
  type LegacySnapshotProvider,
} from "./shadowSessionService";
import { createShadowReadRepository } from "./shadowReadRepository";
import type {
  ShadowLoggerPayload,
  ShadowSessionDiagnostic,
} from "./shadowTypes";

export interface ShadowAuthObserverProps {
  authInstance?: Auth;
  repository?: AuthRepository;
  legacySnapshotProvider?: LegacySnapshotProvider;
  enableLogging?: boolean;
  logger?: (payload: ShadowLoggerPayload) => void;
  onDiagnostic?: (diagnostic: ShadowSessionDiagnostic) => void;
}

const defaultShadowLogger = (payload: ShadowLoggerPayload) => {
  console.info("[Auth Shadow Mode]", payload);
};

export function ShadowAuthObserver({
  authInstance = auth,
  repository,
  legacySnapshotProvider = readLegacySessionSnapshot,
  enableLogging = import.meta.env.DEV,
  logger = defaultShadowLogger,
  onDiagnostic,
}: ShadowAuthObserverProps) {
  const generationRef = useRef(0);
  const shadowRepository = useMemo(
    () => repository ?? createShadowReadRepository(),
    [repository],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser: User | null) => {
      const generation = generationRef.current + 1;
      generationRef.current = generation;

      void runShadowSessionComparison({
        firebaseUser,
        repository: shadowRepository,
        legacySnapshotProvider,
        enableLogging,
        logger,
        onDiagnostic: (diagnostic) => {
          if (generationRef.current !== generation) return;
          onDiagnostic?.(diagnostic);
        },
      }).catch((error) => {
        if (!enableLogging || generationRef.current !== generation) return;
        console.warn("[Auth Shadow Mode] comparison failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return () => {
      generationRef.current += 1;
      unsubscribe();
    };
  }, [
    authInstance,
    enableLogging,
    legacySnapshotProvider,
    logger,
    onDiagnostic,
    shadowRepository,
  ]);

  return null;
}
