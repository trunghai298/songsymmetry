import React from "react";
import Container from "../components/core/Container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  return (
    <Container>
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-4xl font-bold text-white">Music Station</h1>
        <div className="w-full grid grid-cols-3 gap-4 mt-8">
          <Card className="cursor-pointer">
            <div className="flex flex-col p-4 gap-1">
              <div
                style={{
                  backgroundImage:
                    "url('https://i.scdn.co/image/ab67616d0000b273580ac3ad7dfc81e509171120')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  height: "200px",
                }}
              ></div>
              <div className="flex flex-col gap-3 mt-1">
                <h2 className="text-2xl font-bold text-white">
                  Someone's Station
                </h2>
                <p className="text-white text-md">
                  Join the station and listen to the music
                </p>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h3 className="text-white text-sm">Playing: </h3>
                  <h2 className="font-bold text-md">Pink Venom - BLACKPINK</h2>
                  {/* <i className="bi bi-music-note-beamed text-white text-lg"></i> */}
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <Badge variant="outline" className="bg-shadow-gray-light">
                    <div className="flex flex-row items-center justify-start gap-1">
                      <i className="bi bi-boombox-fill text-md"></i>
                      <h3 className="font-normal">ON AIR</h3>{" "}
                      <h2 className="font-bold">jeahyun</h2>
                    </div>
                  </Badge>
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h4 className="text-xs font-light text-gray-300">
                    25 members
                  </h4>
                  <i className="bi bi-dot text-xl"></i>
                  <h4 className="text-xs font-light text-gray-300">25 songs</h4>
                </div>
              </div>
            </div>
          </Card>
          <Card className="cursor-pointer">
            <div className="flex flex-col p-4 gap-1">
              <div
                style={{
                  backgroundImage:
                    "url('https://i.scdn.co/image/ab67616d0000b2732d602ab2d4acff0c2cf57683')",
                  //https://i.scdn.co/image/ab67616d0000b273580ac3ad7dfc81e509171120
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  height: "200px",
                }}
              ></div>
              <div className="flex flex-col gap-3 mt-1">
                <h2 className="text-2xl font-bold text-white">
                  Someone's Station
                </h2>
                <p className="text-white text-md">
                  Join the station and listen to the music
                </p>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h3 className="text-white text-sm">Playing: </h3>
                  <h2 className="font-bold text-md">Pink Venom - BLACKPINK</h2>
                  {/* <i className="bi bi-music-note-beamed text-white text-lg"></i> */}
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <Badge variant="outline" className="bg-shadow-gray-light">
                    <div className="flex flex-row items-center justify-start gap-1">
                      <i className="bi bi-boombox-fill text-md"></i>
                      <h3 className="font-normal">ON AIR</h3>{" "}
                      <h2 className="font-bold">jeahyun</h2>
                    </div>
                  </Badge>
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h4 className="text-xs font-light text-gray-300">
                    25 members
                  </h4>
                </div>
              </div>
            </div>
          </Card>
          <Card className="cursor-pointer">
            <div className="flex flex-col p-4 gap-1">
              <div
                style={{
                  backgroundImage:
                    "url('https://i.scdn.co/image/ab67616d0000b273294bd60dc714e50553eceb73')",
                  //https://i.scdn.co/image/ab67616d0000b2737bf1e8d5308b5286c7b2fe5c
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  height: "200px",
                }}
              ></div>
              <div className="flex flex-col gap-3 mt-1">
                <h2 className="text-2xl font-bold text-white">
                  Someone's Station
                </h2>
                <p className="text-white text-md">
                  Join the station and listen to the music
                </p>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h3 className="text-white text-sm">Playing: </h3>
                  <h2 className="font-bold text-md">2 BADDIES - NCT 127</h2>
                  {/* <i className="bi bi-music-note-beamed text-white text-lg"></i> */}
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <Badge variant="outline" className="bg-shadow-gray-light">
                    <div className="flex flex-row items-center justify-start gap-1">
                      <i className="bi bi-boombox-fill text-md"></i>
                      <h3 className="font-normal">ON AIR</h3>{" "}
                      <h2 className="font-bold">jeahyun</h2>
                    </div>
                  </Badge>
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h4 className="text-xs font-light text-gray-300">
                    25 members
                  </h4>
                </div>
              </div>
            </div>
          </Card>
          <Card className="cursor-pointer">
            <div className="flex flex-col p-4 gap-1">
              <div
                style={{
                  backgroundImage:
                    "url('https://i.scdn.co/image/ab67616d0000b2737bf1e8d5308b5286c7b2fe5c')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  height: "200px",
                }}
              ></div>
              <div className="flex flex-col gap-3 mt-1">
                <h2 className="text-2xl font-bold text-white">
                  Someone's Station
                </h2>
                <p className="text-white text-md">
                  Join the station and listen to the music
                </p>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h3 className="text-white text-sm">Playing: </h3>
                  <h2 className="font-bold text-md">Say - Keshi</h2>
                  {/* <i className="bi bi-music-note-beamed text-white text-lg"></i> */}
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <Badge variant="outline" className="bg-shadow-gray-light">
                    <div className="flex flex-row items-center justify-start gap-1">
                      <i className="bi bi-boombox-fill text-md"></i>
                      <h3 className="font-normal">ON AIR</h3>{" "}
                      <h2 className="font-bold">jeahyun</h2>
                    </div>
                  </Badge>
                </div>
                <div className="flex flex-row items-center justify-start gap-1">
                  <h4 className="text-xs font-light text-gray-300">
                    25 members
                  </h4>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}
