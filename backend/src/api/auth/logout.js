// backend/src/api/auth/logout.js
export default function logout(req, res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.sendStatus(204);
}

