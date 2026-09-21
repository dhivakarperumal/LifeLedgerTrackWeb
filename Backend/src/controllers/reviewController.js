const db = require("../config/db");

exports.uploadReviewImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No review image uploaded" });
  }

  res.status(201).json({
    url: `/uploads/reviews/${req.file.filename}`,
  });
};

// ──────────────────────────────────────────
// PUBLIC: Get all published reviews for a product
// ──────────────────────────────────────────
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!Number.isInteger(Number(productId)) || Number(productId) < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const [reviews] = await db.query(
      `SELECT id, product_id, user_name, rating, comment, review_image, created_at
       FROM reviews
       WHERE product_id = ?
       ORDER BY created_at DESC`,
      [productId]
    );

    // Calculate summary stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM reviews
       WHERE product_id = ?`,
      [productId]
    );

    res.json({
      reviews,
      stats: stats[0] || {
        total_reviews: 0,
        average_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0,
      },
    });
  } catch (err) {
    console.error("Fetch Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
};

// ──────────────────────────────────────────
// PUBLIC: Submit a new review
// ──────────────────────────────────────────
exports.submitReview = async (req, res) => {
  try {
    const { product_id, user_name, user_email, rating, comment, review_image } = req.body;

    if (!product_id || !user_name || !rating) {
      return res.status(400).json({ message: "product_id, user_name, and rating are required." });
    }

    if (!Number.isInteger(Number(product_id)) || Number(product_id) < 1) {
      return res.status(400).json({ message: "Invalid product id." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    // Get user_id from token if available
    const user_id = req.body.user_id || null;

    if (user_id) {
      const [existing] = await db.query(
        `SELECT id FROM reviews WHERE product_id = ? AND user_id = ?`,
        [product_id, user_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: "You have already submitted a review for this product." });
      }
    }

    const [result] = await db.query(
      `INSERT INTO reviews (product_id, user_id, user_name, user_email, rating, comment, review_image, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Published')`,
      [product_id, user_id, user_name, user_email || null, rating, comment || "", review_image || null]
    );

    res.status(201).json({
      message: "Review submitted successfully!",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Submit Review Error:", err);
    res.status(500).json({ message: "Failed to submit review", error: err.message });
  }
};

// ──────────────────────────────────────────
// PUBLIC: Check if user already reviewed
// ──────────────────────────────────────────
exports.checkUserReview = async (req, res) => {
  try {
    const { productId, userId } = req.params;
    if (!Number.isInteger(Number(productId)) || Number(productId) < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const [reviews] = await db.query(
      `SELECT id, status FROM reviews WHERE product_id = ? AND user_id = ?`,
      [productId, userId]
    );

    if (reviews.length > 0) {
      return res.status(200).json({ hasReviewed: true, status: reviews[0].status });
    }
    return res.status(200).json({ hasReviewed: false });
  } catch (err) {
    console.error("Check Review Error:", err);
    res.status(500).json({ message: "Failed to check review status", error: err.message });
  }
};

// ──────────────────────────────────────────
// ADMIN: Get all reviews (with filters)
// ──────────────────────────────────────────
exports.getAllReviews = async (req, res) => {
  try {
    const { status, rating, search } = req.query;

    let query = `
      SELECT r.*, p.name as product_name
      FROM reviews r
      LEFT JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "All") {
      query += " AND r.status = ?";
      params.push(status);
    }

    if (rating) {
      query += " AND r.rating = ?";
      params.push(parseInt(rating));
    }

    if (search) {
      query += " AND (r.user_name LIKE ? OR r.comment LIKE ? OR p.name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY r.created_at DESC";

    const [reviews] = await db.query(query, params);

    // Get overall stats
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as average_rating,
        SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as published_count,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'Flagged' THEN 1 ELSE 0 END) as flagged_count
      FROM reviews
    `);

    res.json({ reviews, stats: stats[0] });
  } catch (err) {
    console.error("Admin Fetch Reviews Error:", err);
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
};

// ──────────────────────────────────────────
// ADMIN: Update review status (Approve / Flag / Delete)
// ──────────────────────────────────────────
exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Published", "Pending", "Flagged"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use Published, Pending, or Flagged." });
    }

    await db.query("UPDATE reviews SET status = ? WHERE id = ?", [status, id]);
    res.json({ message: `Review status updated to ${status}` });
  } catch (err) {
    console.error("Update Review Status Error:", err);
    res.status(500).json({ message: "Failed to update review status", error: err.message });
  }
};

// ──────────────────────────────────────────
// ADMIN: Reply to a review
// ──────────────────────────────────────────
exports.replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_reply } = req.body;

    await db.query("UPDATE reviews SET admin_reply = ? WHERE id = ?", [admin_reply, id]);
    res.json({ message: "Reply added successfully" });
  } catch (err) {
    console.error("Reply to Review Error:", err);
    res.status(500).json({ message: "Failed to add reply", error: err.message });
  }
};


// ──────────────────────────────────────────
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("Delete Review Error:", err);
    res.status(500).json({ message: "Failed to delete review", error: err.message });
  }
};
