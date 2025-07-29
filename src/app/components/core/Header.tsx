"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";
import Logo from "../../../assets/logo2.webp";

export const Header = () => {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [currentPath, setCurrentPath] = React.useState("");
  const session = useSession();
  
  // Get current path for active state
  React.useEffect(() => {
    // Initial path detection
    setCurrentPath(window.location.pathname);
    
    // Update path when it changes
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const isAuthenticated = session.status === "authenticated";
  const isAdminUser = session.data?.user && (session.data.user as any).id === '31scr23lvn5o3erf52cyo7vmlgai';

  return (
    <header className="sticky top-0 w-full p-3 sm:p-4 sm:px-10 z-50 transition-all duration-300 bg-black/20 backdrop-blur-md">
      <nav className="flex w-full items-center justify-between">
        <div
          className="flex gap-x-2 sm:gap-x-3 items-center cursor-pointer group"
          onClick={() => {
            router.push("/");
            setCurrentPath("/");
            setIsMenuOpen(false);
          }}
        >
          <div className="relative">
            <img 
              src={Logo.src} 
              alt="logo" 
              width={32} 
              height={32} 
              className="sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              SongSymmetry
            </h1>
            <div className="text-xs text-gray-400 -mt-1">Music Discovery Platform</div>
          </div>
          {/* Mobile brand name */}
          <div className="sm:hidden">
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              SongSymmetry
            </h1>
          </div>
        </div>
        <div
          className="cursor-pointer sm:hidden block p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all duration-300"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <i className="bi bi-x-lg text-white text-lg transition-transform duration-200 hover:rotate-90" />
          ) : (
            <i className="bi bi-list text-white text-lg transition-transform duration-200 hover:scale-110" />
          )}
        </div>

        <div
          className={`${
            isMenuOpen ? "animate-fade-in" : "hidden"
          } w-full sm:flex sm:items-center sm:w-auto absolute sm:relative top-full sm:top-auto left-0 sm:left-auto sm:bg-transparent mt-0 sm:mt-0 p-4 sm:p-0`}
          id="menu"
        >
          <ul className="text-base text-white flex flex-col sm:flex-row m-0 justify-center sm:justify-between items-center space-y-3 sm:space-y-0 sm:space-x-6 py-2 sm:py-0">
            {/* Always show Explore */}
            <a
              className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                currentPath === "/explore" 
                  ? "text-purple-400" 
                  : "text-gray-200 hover:text-white"
              }`}
              onClick={() => {
                router.push("/explore");
                setCurrentPath("/explore");
                setIsMenuOpen(false);
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <i className="bi bi-compass text-lg"></i>
                Explore
              </span>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                currentPath === "/explore" ? "w-full" : "w-0 group-hover:w-full"
              }`}></div>
            </a>
            
            {/* Show authenticated-only features */}
            {isAuthenticated && (
              <>
                <a
                  className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                    currentPath === "/ai-search" 
                      ? "text-purple-400" 
                      : "text-gray-200 hover:text-white"
                  }`}
                  onClick={() => {
                    router.push("/ai-search");
                    setCurrentPath("/ai-search");
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="bi bi-robot text-lg"></i>
                    AI Search
                  </span>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                    currentPath === "/ai-search" ? "w-full" : "w-0 group-hover:w-full"
                  }`}></div>
                </a>
                <a
                  className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                    currentPath === "/daily-song-game" || currentPath.startsWith("/daily-song-game")
                      ? "text-purple-400" 
                      : "text-gray-200 hover:text-white"
                  }`}
                  onClick={() => {
                    router.push("/daily-song-game");
                    setCurrentPath("/daily-song-game");
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="bi bi-puzzle text-lg"></i>
                    Daily Game
                  </span>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                    currentPath === "/daily-song-game" || currentPath.startsWith("/daily-song-game") ? "w-full" : "w-0 group-hover:w-full"
                  }`}></div>
                </a>
                <a
                  className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                    currentPath === "/wrapped" 
                      ? "text-purple-400" 
                      : "text-gray-200 hover:text-white"
                  }`}
                  onClick={() => {
                    router.push("/wrapped");
                    setCurrentPath("/wrapped");
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="bi bi-music-note-list text-lg"></i>
                    Wrapped
                  </span>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                    currentPath === "/wrapped" ? "w-full" : "w-0 group-hover:w-full"
                  }`}></div>
                </a>
                <a
                  className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                    currentPath === "/receipt" 
                      ? "text-purple-400" 
                      : "text-gray-200 hover:text-white"
                  }`}
                  onClick={() => {
                    router.push("/receipt");
                    setCurrentPath("/receipt");
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="bi bi-receipt text-lg"></i>
                    Receiptify
                  </span>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                    currentPath === "/receipt" ? "w-full" : "w-0 group-hover:w-full"
                  }`}></div>
                </a>
                <a
                  className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                    currentPath === "/station" || currentPath.startsWith("/station/")
                      ? "text-purple-400" 
                      : "text-gray-200 hover:text-white"
                  }`}
                  onClick={() => {
                    router.push("/station");
                    setCurrentPath("/station");
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="bi bi-broadcast text-lg"></i>
                    Station
                  </span>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                    currentPath === "/station" || currentPath.startsWith("/station/") ? "w-full" : "w-0 group-hover:w-full"
                  }`}></div>
                </a>
                {/* Admin link - only visible to admin user */}
                {isAdminUser && (
                  <a
                    className={`group relative text-lg font-medium cursor-pointer transition-all duration-300 ${
                      currentPath === "/admin" 
                        ? "text-purple-400" 
                        : "text-gray-200 hover:text-white"
                    }`}
                    onClick={() => {
                      router.push("/admin");
                      setCurrentPath("/admin");
                      setIsMenuOpen(false);
                    }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <i className="bi bi-gear text-lg"></i>
                      Admin
                    </span>
                    <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300 ${
                      currentPath === "/admin" ? "w-full" : "w-0 group-hover:w-full"
                    }`}></div>
                  </a>
                )}
              </>
            )}
            
            {/* User authentication section */}
            {isAuthenticated ? (
              <>
                {/* Desktop Profile */}
                <div className="hidden sm:inline-block relative cursor-pointer min-w-[100px]">
                  <div
                    className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-400/30 text-white font-semibold py-2 px-3 rounded-full inline-flex items-center gap-2 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-300"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <Avatar className="rounded-full w-[35px] h-[35px] ring-2 ring-purple-400/50">
                      <AvatarImage
                        src={
                          session.data?.user?.image || "https://i.pravatar.cc/300"
                        }
                        alt="user-avatar"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">{session.data?.user?.name}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-md hidden sm:inline md:inline font-bold text-white">
                      {session.data?.user?.name}
                    </h2>
                    {isDropdownOpen ? (
                      <i className="bi bi-caret-up-fill text-white transition-transform duration-200" />
                    ) : (
                      <i className="bi bi-caret-down-fill text-white transition-transform duration-200" />
                    )}
                  </div>
                  <div
                    className={`dropdown-menu absolute ${
                      isDropdownOpen ? "block" : "hidden"
                    } pt-2 flex z-max w-full right-0`}
                  >
                    <div className="bg-gray-800/95 backdrop-blur-md border border-purple-500/30 relative shadow-xl rounded-lg p-2 w-full min-w-[160px]">
                      <ul className="w-full">
                        <li className="">
                          <a
                            className="text-sm text-gray-200 hover:text-white bg-transparent hover:bg-purple-600/30 rounded-md py-2 px-3 block whitespace-no-wrap transition-all duration-200 flex items-center gap-2"
                            href="/profile"
                          >
                            <i className="bi bi-person text-sm"></i>
                            Profile
                          </a>
                        </li>
                        <div className="border-b border-purple-500/20 my-1"></div>
                        <li className="">
                          <a
                            className="text-sm text-gray-200 hover:text-white bg-transparent hover:bg-red-600/30 rounded-md py-2 px-3 block whitespace-no-wrap transition-all duration-200 flex items-center gap-2"
                            href="#"
                            onClick={async () => {
                              await signOut({ callbackUrl: "/" });
                            }}
                          >
                            <i className="bi bi-box-arrow-right text-sm"></i>
                            Sign out
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Profile */}
                <div className="sm:hidden w-full mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Avatar className="rounded-full w-[36px] h-[36px] ring-2 ring-purple-400/50">
                      <AvatarImage
                        src={
                          session.data?.user?.image || "https://i.pravatar.cc/300"
                        }
                        alt="user-avatar"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">{session.data?.user?.name}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h3 className="text-white font-semibold text-sm">{session.data?.user?.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <a
                          className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                          href="/profile"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <i className="bi bi-person text-xs"></i>
                          Profile
                        </a>
                        <a
                          className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                          href="#"
                          onClick={async () => {
                            setIsMenuOpen(false);
                            await signOut({ callbackUrl: "/" });
                          }}
                        >
                          <i className="bi bi-box-arrow-right text-xs"></i>
                          Sign out
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop Sign In */}
                <Button
                  onClick={() => signIn("spotify")}
                  className="hidden sm:flex bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 items-center gap-2"
                >
                  <i className="bi bi-spotify text-lg"></i>
                  <span>Sign in with Spotify</span>
                  <div className="w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
                </Button>
                
                {/* Mobile Sign In */}
                <div className="sm:hidden w-full mt-3 pt-3 border-t border-white/10">
                  <Button
                    onClick={() => signIn("spotify")}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <i className="bi bi-spotify text-lg"></i>
                    <span>Sign in with Spotify</span>
                  </Button>
                </div>
              </>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
};
