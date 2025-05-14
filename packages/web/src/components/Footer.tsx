import { projectInfo } from "@/utils";

export function Footer() {
  const linkClasses = "hover:cursor-pointer hover:underline underline-offset-6";

  return (
    <footer className="h-20 flex flex-row items-center gap-x-10 text-sm text-gray-800">
      <div>
        <a href={projectInfo.src} target="_blank" className={linkClasses}>
          🧑‍💻 src
        </a>
      </div>
      <div>
        <a href={projectInfo.video} target="_blank" className={linkClasses}>
          🎥 demo video
        </a>
      </div>
      <div>
        <a href={projectInfo.blog} target="_blank" className={linkClasses}>
          📖 blog
        </a>
      </div>
    </footer>
  );
}
