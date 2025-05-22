"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";

export const EmbedPlayer = () => {
  const { isOpen, size, track, embedSrc, close, toggleSize } = usePlayer();

  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = 0;
    let y = 0;
    const ele = ref.current;
    if (!ele || !isOpen) return;

    if (track) {
      document.title = `🎶 ${track.name} - ${track.artists[0].name} 🎶`;
    }

    setMinimized(false);

    // Reset position to default bottom right
    ele.style.top = "unset";
    ele.style.left = "unset";
    ele.style.right = "8px";
    ele.style.bottom = size === "compact" ? "8px" : "60px";

    const mouseDownHandler = function (e: any) {
      setDragging(true);
      x = e.clientX;
      y = e.clientY;

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    };

    const mouseMoveHandler = function (e: any) {
      setDragging(true);
      const dx = e.clientX - x;
      const dy = e.clientY - y;

      ele.style.top = `${ele.offsetTop + dy}px`;
      ele.style.left = `${ele.offsetLeft + dx}px`;

      x = e.clientX;
      y = e.clientY;
    };

    const mouseUpHandler = function () {
      setDragging(false);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    ele.addEventListener("mousedown", mouseDownHandler);
    ele.addEventListener("mouseup", mouseUpHandler);
    ele.addEventListener("touchstart", mouseDownHandler);
    ele.addEventListener("touchmove", mouseDownHandler);
    ele.addEventListener("touchcancel", mouseUpHandler);
    ele.addEventListener("touchend", mouseUpHandler);

    return () => {
      ele.removeEventListener("mousedown", mouseDownHandler);
      ele.removeEventListener("mousemove", mouseMoveHandler);
      ele.removeEventListener("touchstart", mouseDownHandler);
      ele.removeEventListener("touchcancel", mouseUpHandler);
      ele.removeEventListener("touchend", mouseUpHandler);
      ele.removeEventListener("touchmove", mouseDownHandler);
    };
  }, [track, isOpen]);

  useEffect(() => {
    if (!dragging) {
      const player = ref.current;
      if (player && player.offsetTop > window.innerHeight - 100) {
        player.style.setProperty("bottom", size === "compact" ? "8px" : "60px");
        player.style.setProperty("top", "unset");
      }
      if (player && player.offsetLeft < 0) {
        player.style.setProperty("left", "0");
        player.style.setProperty("right", "unset");
      }
      if (player && player.offsetTop < 0) {
        player.style.setProperty("top", "100px");
        player.style.setProperty("bottom", "unset");
      }
      if (
        player &&
        window.innerWidth - player.offsetLeft < player.clientWidth
      ) {
        player.style.setProperty("right", "8px");
        player.style.setProperty("left", "unset");
      }
      if (player && player.offsetLeft > window.innerWidth / 2) {
        player?.style.setProperty("right", "8px");
        player?.style.setProperty("left", "unset");
      } else {
        // Only reset left position if we're in the left half of screen
        if (player && player.offsetLeft < window.innerWidth / 2) {
          player?.style.setProperty("left", "8px");
          player?.style.setProperty("right", "unset");
        }
      }
    }
  }, [dragging, size]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      id="player"
      style={{
        width: minimized ? "80px" : "",
        right: "8px",
        left: minimized ? "unset" : "",
      }}
      className={`select-none fixed ${
        size === "compact" ? "h-[80px]" : "h-[300px]"
      } md:w-1/3 lg:w-1/4 ${
        dragging ? "transition" : "transition-all"
      }  ease-in-out duration-500 ${
        size === "compact" ? "bottom-2" : "bottom-[60px]"
      } 
      z-50
      box-border`}
    >
      <div className="absolute flex items-center justify-center space-x-1 right-0 -top-7">
        {!minimized && (
          <i
            className={`select-none bi ${
              size === "compact"
                ? "bi-aspect-ratio"
                : "bi-arrows-angle-contract"
            } font-bold cursor-pointer`}
            onClick={() => {
              // Reset position when toggling size
              if (ref.current) {
                ref.current.style.top = "unset";
                ref.current.style.left = "unset";
                ref.current.style.right = "8px";
                ref.current.style.bottom = size === "compact" ? "60px" : "8px";
              }
              toggleSize();
            }}
          />
        )}
        <i
          className={`select-none bi ${
            minimized ? "bi-arrows-angle-expand" : "bi-dash"
          } text-gray-300 ${
            minimized ? "text-sm" : "text-2xl"
          } font-bold cursor-pointer`}
          onClick={() => {
            // Reset position when toggling minimized state
            if (ref.current) {
              ref.current.style.top = "unset";
              ref.current.style.left = "unset";
              ref.current.style.right = "8px";
              ref.current.style.bottom = size === "compact" ? "8px" : "60px";
            }
            setMinimized(!minimized);
          }}
        />
        <i className="select-none bi bi-arrows-move text-gray-300 text-md cursor-pointer" />
        <i
          className="bi bi-x-lg text-gray-300 text-lg cursor-pointer "
          onClick={close}
        />
      </div>
      <iframe
        src={embedSrc}
        width="100%"
        height={size === "compact" || minimized ? 80 : 352}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="border-0"
      ></iframe>
    </div>
  );
};
