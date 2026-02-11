export type Choice = "left" | "right";

export type Node = {
  id: string;
  question: string;
  left: {
    label: string;
    title: string;
    description?: string;
    mediaUrl: string; // image or video url
    next?: string;    // next node id (optional for MVP)
  };
  right: {
    label: string;
    title: string;
    description?: string;
    mediaUrl: string;
    next?: string;
  };
};

export const TREE: Record<string, Node> = {
  "dorfplatz-1": {
    id: "dorfplatz-1",
    question: "Welche Realität würdest du lieber erleben?",
    left: {
      label: "Chill-Zone",
      title: "Jugend-Chill-Zone",
      description: "Lebendig, freundlich, warmes Licht, Platz zum Treffen.",
      mediaUrl: "/media/chill.jpg",
    },
    right: {
      label: "Ruhige Zone",
      title: "Ruhige Begegnungszone",
      description: "Ruhig, geordnet, subtil beleuchtet, entspannte Atmosphäre.",
      mediaUrl: "/media/ruhig.jpg",
    },
  },
};

export const START_NODE_ID = "dorfplatz-1";
