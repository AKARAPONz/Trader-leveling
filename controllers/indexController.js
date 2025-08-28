module.exports = async (req, res) => {
  const user = req.session.user || { name: 'Guest', profileImage: null };
  res.render('index', { user }); // ส่ง user ไปที่ view
};
