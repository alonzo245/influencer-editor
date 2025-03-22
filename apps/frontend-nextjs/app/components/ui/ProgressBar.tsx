interface ProgressBarProps {
  progress: number;
  text?: string;
}

export default function ProgressBar({ progress, text }: ProgressBarProps) {
  return (
    <div className="">
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {text && <p className="text-center mt-2 text-gray-300">{text}</p>}
    </div>
  );
}
