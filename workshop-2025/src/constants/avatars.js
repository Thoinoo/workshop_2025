import men1 from "../assets/avatars/men1.png";
import men2 from "../assets/avatars/men2.png";
import men3 from "../assets/avatars/men3.png";
import men4 from "../assets/avatars/men4.png";
import women1 from "../assets/avatars/women1.png";
import women2 from "../assets/avatars/women2.png";
import women3 from "../assets/avatars/women3.png";
import women4 from "../assets/avatars/women4.png";

export const AVATARS = [
  { id: "men1", src: men1 },
  { id: "men2", src: men2},
  { id: "men3", src: men3 },
  { id: "men4", src: men4},
  { id: "women1", src: women1 },
  { id: "women2", src: women2},
  { id: "women3", src: women3},
  { id: "women4", src: women4 },
];

export const AVATAR_MAP = AVATARS.reduce((acc, avatar) => {
  acc[avatar.id] = avatar;
  return acc;
}, {});

export const getAvatarById = (id) => AVATAR_MAP[id] || null;
