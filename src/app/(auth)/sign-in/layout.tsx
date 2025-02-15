interface SignInLayoutProps {
  children: React.ReactNode;
}
const SignInLayout = ({ children }: SignInLayoutProps) => {
  return (
    <div className="flex flex-col">
      {children}
    </div>
  );
};

export default SignInLayout;
