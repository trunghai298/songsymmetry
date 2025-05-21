"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";
import Logo from "../../../assets/logo2.webp";

export const Header = () => {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const session = useSession();

  if (session.status === "unauthenticated") return null;

  return (
    <header className="sticky -top-[1px] w-full p-4 sm:px-10 bg-gray-900 z-50 flex justify-between items-center">
      <nav className="flex flex-wrap w-full items-center justify-between sm:space-x-4">
        <div
          className="flex gap-x-1 items-center"
          onClick={() => router.push("/")}
        >
          <img src={Logo.src} alt="logo" width={30} height={30} />
        </div>
        <div
          className="cursor-pointer sm:hidden block"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <i className="bi bi-x-lg text-white text-2xl" />
          ) : (
            <i className="bi bi-list text-white text-2xl " />
          )}
        </div>

        <div
          className={`${
            isMenuOpen ? "" : "hidden"
          } w-full sm:flex sm:items-center sm:w-auto`}
          id="menu"
        >
          <ul className="pt-4 text-base text-white flex flex-col sm:flex-row m-0 justify-between items-center space-y-2 sm:space-y-0 sm:space-x-4 md:pt-0">
            <a
              className="text-lg font-medium hover:text-spotify-green hover:underline cursor-pointer"
              onClick={() => router.push("/wrapped")}
            >
              Wrapped
            </a>
            <a
              className="text-lg font-medium hover:text-spotify-green hover:underline cursor-pointer"
              onClick={() => router.push("/receipt")}
            >
              Receiptify
            </a>
            <a
              className="text-lg font-medium hover:text-spotify-green hover:underline cursor-pointer"
              onClick={() => router.push("/explore")}
            >
              Explore
            </a>
            <div className="hidden sm:inline-block relative cursor-pointer min-w-[100px]">
              <div
                className="bg-gray-300 text-gray-700 font-semibold py-1 px-2 rounded-md inline-flex items-center"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Avatar className="rounded-full w-[35px] h-[35px]">
                  <AvatarImage
                    src={
                      session.data?.user?.image || "https://i.pravatar.cc/300"
                    }
                    alt="user-avatar"
                  />
                  <AvatarFallback>{session.data?.user?.name}</AvatarFallback>
                </Avatar>
                <h2 className="text-md hidden sm:inline md:inline font-bold text-gray-900">
                  {session.data?.user?.name}
                </h2>
                {isDropdownOpen ? (
                  <i className="bi bi-caret-up-fill text-gray-900" />
                ) : (
                  <i className="bi bi-caret-down-fill text-gray-900" />
                )}
              </div>
              <div
                className={`dropdown-menu absolute ${
                  isDropdownOpen ? "block" : "hidden"
                } text-gray-700 pt-1 flex z-max w-full`}
              >
                <div className="bg-white relative shadow-md rounded-lg p-2 w-full">
                  <ul className="w-full">
                    <li className="">
                      <a
                        className="text-sm text-gray-500 bg-white hover:bg-gray-200 rounded-md py-1 px-2 block whitespace-no-wrap"
                        href="/profile"
                      >
                        Profile
                      </a>
                    </li>
                    <div className="border-b border-gray-200 my-1"></div>
                    <li className="">
                      <a
                        className="text-sm text-gray-500 bg-white hover:bg-gray-200 rounded-md py-1 px-2 block whitespace-no-wrap"
                        href="#"
                        onClick={async () => {
                          await signOut({ callbackUrl: "/" });
                        }}
                      >
                        Sign out
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ul>
        </div>
      </nav>
    </header>
  );
};
