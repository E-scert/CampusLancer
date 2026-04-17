const express = require('express');
const router  = express.Router();
const auth    = require('../controllers/authController');

router.get('/',                    auth.getLanding);
router.get('/login',               auth.getLogin);
router.post('/login',              auth.postLogin);
router.get('/register',            auth.getRegisterChoice);
router.get('/register/student',    auth.getRegisterStudent);
router.post('/register/student',   auth.postRegisterStudent);
router.get('/register/business',   auth.getRegisterBusiness);
router.post('/register/business',  auth.postRegisterBusiness);
router.get('/logout',              auth.logout);

module.exports = router;
