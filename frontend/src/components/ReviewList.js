import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../lib/config";

import { socket } from "../lib/socket";

export default function ReviewList({ targetId, type }) {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/reviews/${targetId}`);
            if (res.ok) {
                setReviews(await res.json());
            }
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setLoading(false);
        }
    }, [targetId]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/reviews/stats/${targetId}`);
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    }, [targetId]);

    useEffect(() => {
        if (targetId) {
            fetchReviews();
            fetchStats();

            const handleNewReview = (newReview) => {
                setReviews(prev => [newReview, ...prev]);
                // Re-fetch stats to include new rating
                fetchStats();
            };

            // Listen for specific target reviews
            // type should be 'vendor' or 'rider'
            const eventName = `${type}:review:${targetId}`;
            socket.on(eventName, handleNewReview);

            return () => {
                socket.off(eventName, handleNewReview);
            };
        }
    }, [targetId, type, fetchReviews, fetchStats]);

    if (loading) return <div className="text-gray-400 text-sm">Loading reviews...</div>;

    return (
        <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Reviews</h3>

            {/* Stats Summary */}
            <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl">
                <div className="text-4xl font-black text-riderBlue">{stats.averageRating}</div>
                <div>
                    <div className="flex text-yellow-400 text-sm">
                        {"★".repeat(Math.round(stats.averageRating)) + "☆".repeat(5 - Math.round(stats.averageRating))}
                    </div>
                    <p className="text-xs text-gray-500">{stats.totalReviews} reviews</p>
                </div>
            </div>

            {/* List */}
            {reviews.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No reviews yet.</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="border-b border-gray-100 pb-4 last:border-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{review.reviewerId?.name || "Anonymous"}</p>
                                    <div className="flex text-yellow-400 text-xs mt-1">
                                        {"★".repeat(review.rating) + "☆".repeat(5 - review.rating)}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            {review.comment && (
                                <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
