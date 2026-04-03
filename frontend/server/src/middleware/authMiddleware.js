const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. Log JWT_SECRET existence
        logger.debug(`JWT_SECRET in middleware: ${!!process.env.JWT_SECRET}`);

        // 2. Log full Authorization header
        logger.debug(`Authorization header: ${req.headers.authorization}`);

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            logger.warn("[AUTH_PROTECT] No token provided or invalid format");
            return res.status(401).json({
                success: false,
                message: "Not authorized"
            });
        }

        const token = authHeader.split(" ")[1];

        // 3. Log extracted token
        logger.debug(`Extracted Token: ${token}`);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Log decoded payload on success
        logger.debug("Decoded Token", decoded);

        // IMPORTANT — ensure req.user is always populated
        req.user = decoded;
        logger.debug("[DEBUG] req.user set to:", req.user);

        logger.debug("[AUTH_PROTECT_PASS]", req.user);

        next();

    } catch (error) {
        // 5. Log verification error message
        logger.error(`JWT verification error: ${error.message}`);

        logger.error("[AUTH_PROTECT_ERROR]", { error: error.message });
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
};

module.exports = { protect };

