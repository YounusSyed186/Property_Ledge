import { Pizza } from "lucide-react";
import { CalorieTrackerCard } from "@/components/ui/tracker-card";

export default function CalorieTrackerDemo() {
  // Sample data for the component
  const foodSuggestions = [
    { name: "One bowl of salad and salmon", calories: 285 },
    { name: "Oven Baked Chicken breast", calories: 482 },
  ];

  const handleRecordClick = () => {
    // You can add your custom logic here, e.g., open a modal
    alert("Record button clicked!");
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <CalorieTrackerCard
        icon={<Pizza className="h-6 w-6" />}
        title="Daily Calories"
        subtitle="Calories consumption in a day"
        currentCalories={582}
        goalCalories={2250}
        suggestions={foodSuggestions}
        onRecord={handleRecordClick}
      />
    </div>
  );
}
