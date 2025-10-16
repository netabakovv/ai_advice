export interface AuthTitleProps {
  text: string;
}

export function AuthTitle({ text }: AuthTitleProps) {
  return <h1 className="text-center mb-2">{text}</h1>;
}
