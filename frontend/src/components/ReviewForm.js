import { useState } from "react";
import { API_URL } from "../lib/config";
import { useAuth } from "../context/AuthContext";

export default function ReviewForm({ orderId, targetId, targetRole, onReviewSubmit }) {
    const { user } = useAuth();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/api/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    orderId,
                    targetId,
                    targetRole,
                    rating,
                    comment
                })
            });

            const data = await res.json();

            if (res.ok) {
                if (onReviewSubmit) onReviewSubmit(data.review);
            } else {
                setError(data.message || "Failed to submit review.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
            <h4 className="font-bold text-sm text-gray-700 mb-2">Rate your experience</h4>

            <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                        ★
                    </button>
                ))}
            </div>

            <textarea
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-riderBlue resize-none"
                rows="3"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            ></textarea>

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full bg-riderBlue text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
                {loading ? "Submitting..." : "Submit Review"}
            </button>
        </form>
    );
}
