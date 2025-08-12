import { css, keyframes } from "@emotion/css";

export const glowPulse = keyframes`
  0% {
    box-shadow: 0 0 2px #00b8d4, 0 0 4px #00b8d4;
  }
  50% {
    box-shadow: 0 0 8px #00b8d4, 0 0 12px #00b8d4;
  }
  100% {
    box-shadow: 0 0 2px #00b8d4, 0 0 4px #00b8d4;
  }
`;

export const glowingEffect = {
  animation: `${glowPulse} 2s infinite ease-in-out`,
};

export const glowingEffectForText = css`
  position: relative;

  &::after {
    content: "";
    position: absolute;
    inset: 5px;
    inset-inline-start: -2px;
    inset-inline-end: -2px;
    background: linear-gradient(45deg, #228be6, #40c057);
    border-radius: 8px;
    filter: blur(8px);
    opacity: 0;
    transition: opacity 0.3s;
    z-index: -1;
  }
  &:not(:has(button:disabled))::after {
    animation: glow 3s infinite;
  }
  @keyframes glow {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
  }
`;
