import React from "react";
import Container from "../components/core/Container";
import { Loader } from "../components/core/Loader";

const Page = () => {
  const isLoaded = true;
  const isSignedIn = true;

  if (!isLoaded) return <Loader />;
  if (!isSignedIn) return <div>Not signed in</div>;
  return (
    <Container>
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-4xl font-bold text-white">Profile</h1>
        <p className="text-white text-lg">Welcome</p>
      </div>
    </Container>
  );
};

export default Page;
