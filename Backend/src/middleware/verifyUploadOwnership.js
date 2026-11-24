const db = require("../config/db");

const tables = {
  memory: "memories",
  diary: "diary_entries",
};

const verifyUploadOwnership = (entryType) => {
  const table = tables[entryType];
  if (!table) throw new Error(`Unsupported upload owner type: ${entryType}`);

  return async (req, res, next) => {
    try {
      const entryId = Number(req.params.id);
      if (!Number.isSafeInteger(entryId) || entryId <= 0) {
        return res.status(404).json({ success: false, message: `${entryType} entry not found.` });
      }

      const [rows] = await db.query(`SELECT id, user_id FROM ${table} WHERE id = ?`, [entryId]);
      const isAdmin = req.user.role?.toLowerCase() === "admin";
      if (!rows.length || (!isAdmin && rows[0].user_id !== req.user.user_id)) {
        return res.status(404).json({ success: false, message: `${entryType} entry not found.` });
      }

      req.uploadOwnerId = rows[0].user_id;
      next();
    } catch (error) {
      console.error(`Verify ${entryType} upload owner error:`, error.message);
      next(error);
    }
  };
};

module.exports = verifyUploadOwnership;
