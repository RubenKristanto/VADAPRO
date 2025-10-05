module.exports = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string' ||
      username.trim().length < 3 || password.trim().length < 3) {
    return res.status(400).json({ message: 'Username and password must be at least 3 characters' });
  }
  next();
};