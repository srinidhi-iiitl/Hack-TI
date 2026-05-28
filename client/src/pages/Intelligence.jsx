import React from 'react';
import { motion } from "framer-motion";

const insights = [
  {
    
  title: "Health Insight",
  value: "Sleep quality improved by 12%",
  icon: "💪",
  color: "from-pink-500 to-orange-400",
  confidence: "94%"

  },
  {
    title: "Finance Insight",
    value: "Spending pattern is stable this week",
    icon: "💰",
    color: "from-cyan-500 to-blue-500",
    confidence: "91%"
  },
  {
    title: "Career Insight",
    value: "Peak productivity detected at 8PM",
    icon: "🚀",
    color: "from-violet-500 to-fuchsia-500",
    confidence: "95%"
  }
];

const recommendations = [
  "Try sleeping 30 mins earlier for better recovery",
  "Reduce entertainment spending by 8%",
  "Schedule focused coding sessions in evening hours",
  "Your consistency streak is improving"
];

const Intelligence = () => {
  return (
<div className="min-h-screen bg-[#050816] text-white px-8 pt-8 pb-8 relative overflow-hidden">  <div className="absolute top-20 right-20
w-72 h-72 bg-pink-500/20 blur-3xl rounded-full"></div>

<div className="absolute bottom-10 left-10
w-72 h-72 bg-cyan-500/20 blur-3xl rounded-full"></div>
      {/* Header */}
<div className="mb-4 relative z-10">       
  <h1 className="text-5xl font-bold mb-1">
          AI Intelligence Center
        </h1>

        <p className="text-gray-400 text-lg max-w-2xl">
          Your Digital Twin continuously analyzes health,
          finance, and career signals to generate
          intelligent life insights.
        </p>
      </div>

      {/* Insight Cards */}
<div className="grid md:grid-cols-3 gap-6 mb-10 relative z-10">
        {insights.map((item, index) => (
          <motion.div
  key={index}
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: index * 0.2 }}
  whileHover={{
    scale: 1.05,
    y: -10
  }}
  className={`bg-gradient-to-br ${item.color}
  rounded-3xl p-6 shadow-2xl
  transition duration-300`}
>
            <div className="text-5xl mb-4">
              {item.icon}
            </div>

            <h2 className="text-2xl font-bold mb-3">
              {item.title}
            </h2>

            <p className="text-white/90">
              {item.value}
            </p>
            <div className="mt-4 text-sm text-white/80">
  AI Confidence: {item.confidence}
</div>
<div className="mt-3 w-full bg-white/20 rounded-full h-2">
  <div className="bg-white h-2 rounded-full w-[75%]"></div>
</div>
          </motion.div>
        ))}

      </div>

      {/* AI Recommendations */}
<div className="bg-white/5 border border-white/10
rounded-3xl p-8 backdrop-blur-xl relative z-10"> 

        <h2 className="text-3xl font-bold mb-6">
          Today's AI Recommendations
        </h2>

        <div className="space-y-4">

          {recommendations.map((item, index) => (
            <div
              key={index}
              className="bg-white/5 p-4 rounded-2xl
              hover:bg-white/10 transition"
            >
              ✨ {item}
            </div>
          ))}

        </div>

      </div>

    </div>
  );
};

export default Intelligence;