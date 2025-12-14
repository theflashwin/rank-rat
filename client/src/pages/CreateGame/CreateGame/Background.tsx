import React from "react";

interface BackgroundProps {
    leftPoly: string;
    rightPoly: string;
}

export default function Background({ leftPoly, rightPoly }: BackgroundProps) {
    return (
        <>
            <div
                className="absolute inset-0 bg-linear-to-br from-[#162f82] via-[#316bd6] to-[#4c86c8]"
                style={{ clipPath: `polygon(${leftPoly})` }}
            />
            <div
                className="absolute inset-0 bg-linear-to-tr from-[#8f1616] via-[#c43535] to-[#d75a5a]"
                style={{ clipPath: `polygon(${rightPoly})` }}
            />
        </>
    );
}

