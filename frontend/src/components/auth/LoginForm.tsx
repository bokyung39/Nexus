"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { loginValidation } from "@/utils/validators/userValidation";
import { authApi } from "@/app/_api/models/auth";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function LoginFormComponent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [serverError, setServerError] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (serverError) {
      const timer = setTimeout(() => {
        setServerError("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [serverError]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // 실시간 유효성 검사
    const validationError =
      loginValidation[id as keyof typeof loginValidation]?.(value) || ""; // undefined를 빈 문자열로 변환
    setErrors((prev) => ({
      ...prev,
      [id]: validationError,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors = {
      email: loginValidation.email(formData.email) || "",
      password: loginValidation.password(formData.password) || "",
      global: "", // 전역 에러 초기화
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await authApi.login(formData);

      // 로그인 성공: 토큰 저장 및 페이지 이동
      Cookies.set("access_token", data.access_token);
      Cookies.set("refresh_token", data.refresh_token);

      router.push("/myproject");
      alert("로그인되었습니다.");
    } catch (error: any) {
      const serverErrorMessage =
        error.response?.data?.message || "로그인에 실패했습니다.";

      setServerError(serverErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {serverError && (
          <div
            className="bg-red-50 text-red-500 p-3  rounded-lg text-sm 
                  transition-all duration-500 ease-in-out 
                  opacity-100 animate-in fade-in "
          >
            {serverError}
          </div>
        )}
        <div className="space-y-2">
          <Input
            id="email"
            placeholder="이메일 (Demo: steve@nexus.com)"
            className="text-lg p-6"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            id="password"
            type="password"
            placeholder="비밀번호 (Demo: steve)"
            className="text-lg p-6"
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>
        <div className="text-sm text-right">
          <a
            href="/register"
            className="text-gray-500 hover:text-gray-700 pr-2"
          >
            회원가입
          </a>
          <a
            href="/forgot-password"
            className="text-gray-500 hover:text-gray-700"
          >
            비밀번호 재설정
          </a>
        </div>
        <Button className="w-full bg-custom-point hover:bg-custom-hover text-lg py-6">
          로그인
        </Button>
        <div className="space-y-2">
          <p>
            <span className="font-semibold">email:</span> steve@nexus.com
          </p>
          <p>
            <span className="font-semibold">password:</span> steve
          </p>
        </div>
      </div>
    </form>
  );
}
