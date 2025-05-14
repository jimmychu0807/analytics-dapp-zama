export function Header() {
  const linkClasses =
    "hover:cursor-pointer hover:underline hover:decoration-gray-400 underline-offset-3";

  return (
    <header className="h-20 flex flex-col items-center justify-center gap-8">
      <div className="py-4">
        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight text-center">
          Analytics dApp
        </h3>
        <p className="text-muted-foreground text-center">
          built on&nbsp;
          <a
            className={linkClasses}
            href="https://www.zama.ai/products-and-services/fhevm"
            target="_blank"
          >
            Zama fhEVM
          </a>
        </p>
      </div>
    </header>
  );
}
