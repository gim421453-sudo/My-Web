import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    login,
    loading,
    authError,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    try {
      await login(email, password);

      navigate("/");
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(event) =>
          setEmail(event.target.value)
        }
        placeholder="이메일"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(event) =>
          setPassword(event.target.value)
        }
        placeholder="비밀번호"
        required
      />

      <button
        type="submit"
        disabled={loading}
      >
        {loading
          ? "로그인 확인 중..."
          : "로그인"}
      </button>

      {authError && (
        <p role="alert">
          {authError}
        </p>
      )}
    </form>
  );
}