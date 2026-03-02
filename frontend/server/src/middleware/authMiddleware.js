const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("[AUTH_PROTECT] No token provided");
            return res.status(401).json({
                success: false,
                message: "Not authorized"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[DEBUG] JWT decoded payload:", decoded);

        // IMPORTANT — ensure req.user is always populated
        req.user = decoded;
        console.log("[DEBUG] req.user set to:", req.user);

        console.log("[AUTH_PROTECT_PASS]", req.user);

        next();

    } catch (error) {
        console.log("[DEBUG] JWT verification failed:", error.message);
        console.log("[AUTH_PROTECT_ERROR]", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
};

module.exports = { protect };

