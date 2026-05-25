export interface StaticResourceLink {
  label: string;
  description: string;
  href: string;
}

export const CS201_TEXTBOOK_LINK: StaticResourceLink = {
  label: "COMPSCI201 Textbook",
  description: "Local PDF copy of the CS201 course textbook.",
  href: "/course-materials/textbook/cs201-textbook.pdf",
};
