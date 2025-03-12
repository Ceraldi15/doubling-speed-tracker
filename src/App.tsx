import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./styles.css";

interface MetricValue {
  date: string;
  value: number;
}

interface Metric {
  id: number;
  name: string;
  values: MetricValue[];
  baseValue: number;
  lastUpdated: string | null;
}

interface DoublingRate {
  daysPerDoubling: string;
  monthsPerDoubling: string;
  projectedNextDouble: string;
}

export default function App() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: 1, name: "Followers", values: [], baseValue: 100, lastUpdated: null },
    { id: 2, name: "Revenue", values: [], baseValue: 1000, lastUpdated: null },
    { id: 3, name: "Customers", values: [], baseValue: 10, lastUpdated: null },
  ]);

  const [newMetricName, setNewMetricName] = useState<string>("");
  const [newBaseValue, setNewBaseValue] = useState<number>(100);
  const [selectedMetric, setSelectedMetric] = useState<number | null>(null);
  const [newValue, setNewValue] = useState<string>("");
  const [doublingRates, setDoublingRates] = useState<
    Record<number, DoublingRate | string>
  >({});

  // LOAD DATA FROM LOCALSTORAGE - Add this useEffect
  useEffect(() => {
    try {
      const savedMetrics = localStorage.getItem("doublingMetrics");
      if (savedMetrics) {
        setMetrics(JSON.parse(savedMetrics));
      }
    } catch (e) {
      console.error("Error loading from localStorage", e);
    }
  }, []);

  // SAVE DATA TO LOCALSTORAGE - Add this useEffect
  useEffect(() => {
    try {
      localStorage.setItem("doublingMetrics", JSON.stringify(metrics));
    } catch (e) {
      console.error("Error saving to localStorage", e);
    }
  }, [metrics]);

  // Calculate the doubling rate for a metric
  const calculateDoublingRate = (
    values: MetricValue[]
  ): string | DoublingRate => {
    if (values.length < 2) return "Need more data";

    const firstEntry = values[0];
    const lastEntry = values[values.length - 1];
    const totalGrowth = lastEntry.value / firstEntry.value;

    if (totalGrowth < 2) return "Not doubled yet";

    const timeInDays =
      (new Date(lastEntry.date).getTime() -
        new Date(firstEntry.date).getTime()) /
      (1000 * 60 * 60 * 24);
    const doublings = Math.log2(totalGrowth);
    const daysPerDoubling = timeInDays / doublings;

    return {
      daysPerDoubling: daysPerDoubling.toFixed(1),
      monthsPerDoubling: (daysPerDoubling / 30).toFixed(1),
      projectedNextDouble: new Date(
        new Date(lastEntry.date).getTime() +
          daysPerDoubling * 1000 * 60 * 60 * 24
      ).toLocaleDateString(),
    };
  };

  // Effect to calculate doubling rates whenever metrics change
  useEffect(() => {
    const newRates: Record<number, DoublingRate | string> = {};
    metrics.forEach((metric) => {
      if (metric.values.length >= 2) {
        newRates[metric.id] = calculateDoublingRate(metric.values);
      }
    });
    setDoublingRates(newRates);
  }, [metrics]);

  // Add a new metric
  const addMetric = () => {
    if (newMetricName.trim() === "") return;

    setMetrics([
      ...metrics,
      {
        id: Math.max(0, ...metrics.map((m) => m.id)) + 1,
        name: newMetricName,
        values: [],
        baseValue: newBaseValue,
        lastUpdated: null,
      },
    ]);

    setNewMetricName("");
    setNewBaseValue(100);
  };

  // Add a new value entry to a metric
  const addValueEntry = () => {
    if (!selectedMetric || newValue === "") return;

    const updatedMetrics = metrics.map((metric) => {
      if (metric.id === selectedMetric) {
        const newValues = [
          ...metric.values,
          {
            date: new Date().toISOString().split("T")[0],
            value: parseFloat(newValue),
          },
        ].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ); // Keep sorted by date

        return {
          ...metric,
          values: newValues,
          lastUpdated: new Date().toISOString().split("T")[0],
        };
      }
      return metric;
    });

    setMetrics(updatedMetrics);
    setNewValue("");
  };

  // Delete a metric
  const deleteMetric = (id: number) => {
    setMetrics(metrics.filter((metric) => metric.id !== id));
  };

  // Format chart data for a specific metric
  const getChartData = (metricId: number) => {
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric || metric.values.length < 2) return [];

    return metric.values.map((entry) => ({
      date: entry.date,
      value: entry.value,
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Doubling Speed Tracker
      </h1>

      {/* Add new metric form */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Add New Metric to Track</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Metric name (e.g., Followers)"
            value={newMetricName}
            onChange={(e) => setNewMetricName(e.target.value)}
            className="p-2 border rounded flex-grow"
          />
          <input
            type="number"
            placeholder="Starting value"
            value={newBaseValue}
            onChange={(e) => setNewBaseValue(parseInt(e.target.value))}
            className="p-2 border rounded w-36"
          />
          <button
            onClick={addMetric}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Metric
          </button>
        </div>
      </div>

      {/* Add new entry form */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Record New Value</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedMetric || ""}
            onChange={(e) => setSelectedMetric(parseInt(e.target.value))}
            className="p-2 border rounded flex-grow"
          >
            <option value="">Select a metric</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Current value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="p-2 border rounded w-36"
          />
          <button
            onClick={addValueEntry}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Record Value
          </button>
        </div>
      </div>

      {/* Metrics overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="border rounded-lg p-4 bg-white shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold">{metric.name}</h3>
                <button
                  onClick={() => deleteMetric(metric.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>

              <div className="mb-3">
                <p>
                  <strong>Starting value:</strong> {metric.baseValue}
                </p>
                <p>
                  <strong>Current value:</strong>{" "}
                  {metric.values.length > 0
                    ? metric.values[metric.values.length - 1].value
                    : "No data yet"}
                </p>
                <p>
                  <strong>Last updated:</strong> {metric.lastUpdated || "Never"}
                </p>
              </div>

              <div className="mb-3">
                <h4 className="font-semibold">Doubling Rate:</h4>
                {doublingRates[metric.id] ? (
                  typeof doublingRates[metric.id] === "string" ? (
                    <p>{doublingRates[metric.id]}</p>
                  ) : (
                    <div>
                      <p>
                        <strong>Days per doubling:</strong>{" "}
                        {
                          (doublingRates[metric.id] as DoublingRate)
                            .daysPerDoubling
                        }
                      </p>
                      <p>
                        <strong>Months per doubling:</strong>{" "}
                        {
                          (doublingRates[metric.id] as DoublingRate)
                            .monthsPerDoubling
                        }
                      </p>
                      <p>
                        <strong>Next projected double:</strong>{" "}
                        {
                          (doublingRates[metric.id] as DoublingRate)
                            .projectedNextDouble
                        }
                      </p>
                    </div>
                  )
                ) : (
                  <p>Need more data</p>
                )}
              </div>

              {metric.values.length > 1 && (
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData(metric.id)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        name={metric.name}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {metrics.length === 0 && (
        <div className="text-center p-10 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-600">
            No metrics added yet. Add your first metric to start tracking!
          </p>
        </div>
      )}
    </div>
  );
}
