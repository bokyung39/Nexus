"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";
import LogoutModal from "../modal/LogoutModal";
export const LogoutButton = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <>
        <Button onClick={() => setIsOpen(true)}>로그아웃</Button>
        <LogoutModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    </>
  );
};
