/* eslint-disable @next/next/no-img-element */
"use client";

import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { useSession, signIn } from "next-auth/react";
import sdk from "../lib/spotify-sdk/ClientInstance";
import Image from "next/image";
import BackGround from "../assets/bg.png";
import TopTracks from "./components/TopTracks";
import UserPlaylists from "./components/UserPlaylists";
import Container from "./components/Container";
import { Button } from "@/components/ui/button";

export default function Home() {
  const session = useSession();

  if (!session || session.status !== "authenticated") {
    return (
      <div
        className="h-full min-h-screen max-h-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(90deg, #417B94 3.82%, rgba(74, 163, 199, 0.71) 95.66%)",
        }}
      >
        <div className="relative px-40 flex flex-col sm:flex-row sm:items-end justify-around h-full min-h-screen max-h-screen overflow-hidden">
          <div className="absolute -top-[10%] right-0 w-full opacity-10 z-0 overflow-hidden">
            <h1 className="w-full text-400px font-extrabold">ISUMUSIC</h1>
          </div>
          <div className="absolute -bottom-[10%] right-0 w-full opacity-10 z-0 overflow-hidden">
            <h1 className="w-full text-400px font-extrabold">NEWAYNA</h1>
          </div>
          <div className="h-full min-h-screen flex flex-col items-center justify-center z-max">
            <h1 className="text-5xl font-extrabold sm:text-7xl md:text-8xl lg:text-9xl">
              Song Symmetry
            </h1>
            <div className="mt-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="34"
                height="34"
                viewBox="0 0 34 34"
                fill="none"
              >
                <path
                  d="M16.0601 0.587264L8.86476 2.13792C8.60683 2.19292 8.37555 2.33467 8.20947 2.53953C8.04339 2.74438 7.95254 2.99998 7.95207 3.2637V15.6468C7.42708 15.4644 6.87516 15.3717 6.3194 15.3724C3.80633 15.3724 1.76898 17.2177 1.76898 19.4941C1.76898 21.7704 3.80633 23.6158 6.31947 23.6158C8.04656 23.6158 9.77399 22.677 10.492 21.0764C11.116 19.6854 10.8698 18.0132 10.8698 16.5213V6.6222L20.779 4.32069C20.7449 1.87242 18.4654 0.0689634 16.0601 0.587331L16.0601 0.587264Z"
                  fill="#FACD66"
                />
                <path
                  d="M16.0565 11.998V25.2556C16.0563 25.2872 16.0488 25.3184 16.0345 25.3466C16.0202 25.3748 15.9996 25.3993 15.9742 25.4181C15.9488 25.437 15.9194 25.4497 15.8882 25.4552C15.8571 25.4607 15.8251 25.4589 15.7948 25.4499C15.349 25.3225 14.8875 25.2581 14.4238 25.2585C11.9107 25.2585 9.87341 27.1039 9.87341 29.3802C9.87341 31.6566 11.9107 33.5019 14.4238 33.5019C16.1509 33.5019 17.8784 32.5631 18.5964 30.9625C19.2204 29.5715 18.9743 27.8993 18.9743 26.4075V15.6245C18.9744 15.5481 19.0004 15.474 19.048 15.4143C19.0957 15.3545 19.1621 15.3127 19.2366 15.2955L28.8834 13.055C28.9331 13.0433 28.9848 13.043 29.0346 13.054C29.0844 13.0651 29.1311 13.0873 29.1712 13.1189C29.2112 13.1505 29.2436 13.1908 29.266 13.2367C29.2883 13.2826 29.3 13.3329 29.3002 13.384V24.242C29.3 24.2737 29.2925 24.3048 29.2782 24.333C29.2639 24.3613 29.2433 24.3858 29.2179 24.4046C29.1925 24.4235 29.1631 24.4362 29.1319 24.4417C29.1008 24.4472 29.0688 24.4454 29.0385 24.4364C28.5926 24.309 28.1312 24.2445 27.6675 24.245C25.1544 24.245 23.1171 26.0903 23.1171 28.3667C23.1171 30.6431 25.1544 32.4884 27.6674 32.4884C29.1883 32.4884 30.7005 31.7011 31.5534 30.413C32.3799 29.1648 32.2183 27.8537 32.2179 26.4434C32.2171 23.9282 32.2171 21.413 32.2179 18.8979V8.84263C32.2174 8.69088 32.1829 8.54116 32.1171 8.40444C32.0512 8.26773 31.9556 8.14748 31.8372 8.0525C31.7189 7.95752 31.5808 7.89023 31.433 7.85554C31.2853 7.82086 31.1317 7.81966 30.9834 7.85204L16.9692 10.8722C16.7113 10.9272 16.48 11.069 16.3139 11.2738C16.1478 11.4787 16.057 11.7343 16.0565 11.998Z"
                  fill="#A4C7C6"
                />
                <path
                  d="M27.3081 13.384C27.3079 13.3329 27.2962 13.2826 27.2739 13.2367C27.2515 13.1908 27.2191 13.1505 27.1791 13.1189C27.139 13.0873 27.0923 13.0651 27.0425 13.054C26.9927 13.043 26.941 13.0433 26.8913 13.055L17.2445 15.2955C17.17 15.3127 17.1036 15.3545 17.0559 15.4143C17.0083 15.474 16.9823 15.5481 16.9822 15.6245V26.4075C16.9822 27.8993 17.2283 29.5715 16.6043 30.9626C16.0241 32.2559 14.7847 33.1168 13.419 33.3998C13.7497 33.4676 14.0864 33.5018 14.4239 33.5019C16.151 33.5019 17.8785 32.5631 18.5965 30.9625C19.2205 29.5715 18.9744 27.8993 18.9744 26.4075V15.6245C18.9745 15.5481 19.0005 15.474 19.0481 15.4143C19.0958 15.3545 19.1622 15.3127 19.2367 15.2955L27.3081 13.4209V13.384ZM14.0623 25.2727C13.8491 25.2877 13.6371 25.3165 13.4276 25.3588C13.5546 25.3847 13.6799 25.4147 13.8027 25.4499C13.8316 25.4584 13.862 25.4603 13.8917 25.4557C13.9214 25.451 13.9497 25.4397 13.9745 25.4228C13.9994 25.4058 14.0201 25.3835 14.0353 25.3576C14.0505 25.3316 14.0597 25.3026 14.0623 25.2726V25.2727ZM32.218 26.4434C32.2172 23.9282 32.2172 21.413 32.218 18.8979V8.84263C32.2175 8.69088 32.183 8.54116 32.1172 8.40444C32.0513 8.26773 31.9557 8.14748 31.8373 8.0525C31.719 7.95752 31.5809 7.89023 31.4331 7.85554C31.2854 7.82086 31.1318 7.81966 30.9835 7.85204L29.8857 8.08865C29.9927 8.18295 30.0784 8.29898 30.137 8.42898C30.1956 8.55899 30.2259 8.70001 30.2258 8.84263V26.4434C30.2262 27.8536 30.3878 29.1648 29.5613 30.413C28.8792 31.4207 27.8345 32.1263 26.6449 32.3826C26.9813 32.4528 27.324 32.4882 27.6676 32.4884C29.1883 32.4884 30.7006 31.7011 31.5535 30.413C32.38 29.1648 32.2184 27.8537 32.218 26.4434ZM27.306 24.2591C27.0928 24.2742 26.8808 24.303 26.6712 24.3453C26.7983 24.3711 26.9236 24.4012 27.0464 24.4364C27.0752 24.4449 27.1056 24.4469 27.1353 24.4422C27.165 24.4375 27.1933 24.4262 27.2182 24.4093C27.243 24.3923 27.2638 24.37 27.279 24.3441C27.2942 24.3181 27.3034 24.2891 27.306 24.2591Z"
                  fill="#9CBCBB"
                />
              </svg>
            </div>
            <h3 className="text-sm sm:text-lg font-normal mt-8 px-8 text-center text-white w-[400px]">
              {
                "Explore your personalized Spotify journey with unique insights tailored just for you. Discover your music habits, top genres, and favorite artists in a whole new way."
              }
            </h3>
            <Button
              className="w-auto min-w-[300px] h-auto mt-10 text-white text-xl sm:text-3xl font-bold px-4 sm:px-6 md:px-8 lg:px-10 py-2 sm:py-3 md:py-4 rounded-full bg-spotify-green hover:bg-spotify-green/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => signIn("spotify")}
            >
              <i className="bi bi-spotify text-lg sm:text-4xl mr-4"></i>
              Sign in with Spotify
            </Button>
          </div>
          <div className="w-full hidden sm:flex flex-col justify-start sm:justify-items-end items-end z-max">
            <img src={BackGround.src} alt="" width={500} height={800} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Container>
      <WelcomeSection sdk={sdk} />
      <TopTracks />
      <UserPlaylists />
    </Container>
  );
}

const WelcomeSection = ({ sdk }: { sdk: SpotifyApi }) => {
  return (
    <section className="w-full py-4 md:py-8 lg:py-12 xl:py-18">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="">
            <h1 className="text-3xl text-white font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Personalized Insights from Spotify
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl py-4 dark:text-gray-400">
              Uncover your music journey with personalized analytics and data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
