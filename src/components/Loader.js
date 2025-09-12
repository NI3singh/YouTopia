// In src/components/Loader.js

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <svg 
        className="w-20 h-20" 
        viewBox="0 0 44 44" 
        xmlns="http://www.w3.org/2000/svg" 
        stroke="#22d3ee" // The base color is cyan-400
      >
        <g fill="none" fillRule="evenodd" strokeWidth="2">
          <circle cx="22" cy="22" r="1" className="animate-pulse-loader">
            <animate 
              attributeName="r"
              begin="0s" dur="1.8s"
              values="1; 20"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.165, 0.84, 0.44, 1"
              repeatCount="indefinite" />
            <animate 
              attributeName="stroke-opacity"
              begin="0s" dur="1.8s"
              values="1; 0"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.3, 0.61, 0.355, 1"
              repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="22" r="1" className="animate-pulse-loader">
            <animate 
              attributeName="r"
              begin="-0.9s" dur="1.8s"
              values="1; 20"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.165, 0.84, 0.44, 1"
              repeatCount="indefinite" />
            <animate 
              attributeName="stroke-opacity"
              begin="-0.9s" dur="1.8s"
              values="1; 0"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.3, 0.61, 0.355, 1"
              repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
      <p className="text-slate-400 text-lg">Loading your library...</p>
    </div>
  );
}