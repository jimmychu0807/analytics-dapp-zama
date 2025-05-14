export function Header() {
  return (
    <header className="h-20 flex flex-col items-center justify-center gap-8">
      <div className="py-4">
        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight text-center">
          Analytics dApp
        </h3>
        <p className="text-muted-foreground text-center">built on Zama fhEVM</p>
      </div>
    </header>
  );
}
