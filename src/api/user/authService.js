const _ = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./user');
const env = require('../../env');

const emailRegex = /\S+@\S+\.\S+/;
const passwordRegex = /((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%]).{6,20})/;

const sendErrorFromDB = (res, dbErrors) => {
    const errors = [];

    _.forIn(dbErrors.errors, error => errors.push(error.message));

    return res.status(400).json({ errors });
}

const login = (req, res, next) => {
    const email = req.body.email || '';
    const password = req.body.password || '';

    User.findOne({ email }, (err, user) => {
        if (err) {
            return sendErrorFromDB(res, err);
        }
        else if (user && bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign(user, env.authSecret, {
                expiresIn: '1 day'
            });

            const { name, email } = user;
            res.json({ name, email, token });
        }
        else {
            return res.status(400).json({ errors: ['Usuário/Senha inválidos'] });
        }
    });
}

const validateToken = (req, res, next) => {
    const token = req.body.token || '';

    jwt.verify(token, env.authSecret, (err, decoded) => {
        return res.status(200).send({ valid: !err });
    });
}

const sigup = (req, res, next) => {
    const name = req.body.name || '';
    const email = req.body.email || '';
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    if (!email.match(emailRegex)) {
        return res.status(400).send({ errors: ['O e-mail informado é inválido'] });
    }

    if (!password.match(passwordRegex)) {
        return res.status(400).send({ errors: ['A Senha precisar ter: uma letra maiúscula, uma letra minúscula, um número, uma caractere especial(@#$%) e tamanho entre 6-20'] });
    }

    if (!bcrypt.compareSync(confirmPassword, passwordHash)) {
        return res.status(400).send({ errors: ['Senhas não conferem.'] });
    }

    const salt = bcrypt.genSaltSync();
    const passwordHash = bcrypt.hashSync(password, salt);

    User.findOne({ email }, (err, user) => {
        if (err) {
            return sendErrorsFromDB(res, err)
        } else if (user) {
            return res.status(400).send({ errors: ['Usuário já cadastrado.'] })
        } else {
            const newUser = new User({ name, email, password: passwordHash })
            newUser.save(err => {
                if (err) {
                    return sendErrorsFromDB(res, err)
                } else {
                    login(req, res, next)
                }
            })
        }
    });
}

module.exports = { login, validateToken, sigup };