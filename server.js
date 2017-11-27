const express = require('express')
const app = express();
const hb = require('express-handlebars');
const bodyParser = require('body-parser');
const pg = require('pg');
const spicedPg = require('spiced-pg');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const csurf = require('csurf')
const bcrypt = require('bcryptjs') //crypto module for password
const db = spicedPg(process.env.DATABASE_URL || 'postgres:Amedeo:Tafano83@localhost:5432/petition');

// const redis = require('./redis')


//Setting handlebars
app.engine('handlebars', hb());
app.set('view engine', 'handlebars');


//Middlewares

// app.use(csurf({cookie: true}));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
// var csrfProtection = csurf({ cookie: true })
app.use(csurf({
    cookie: true
}))
app.use(cookieSession({
    secret: 'a really hard to guess secret',
    maxAge: 1000 * 60 * 60 * 24 * 14
}));
// var csrfProtection = csurf()
app.use('/public', express.static(__dirname + '/public'));


app.get('/register', function(req, res) {
    res.render('register', {
        csrfToken: req.csrfToken(),
        layout: 'main'
    })
})
app.get('/', function(req, res) {
    res.redirect('/register')
})

app.post('/register', function(req, res) {
    if (!req.body.password || !req.body.firstname || !req.body.lastname || !req.body.email) {
        res.render('register', {
            csrfToken: req.csrfToken(),
            layout: 'main',
            error: 'Please fill out all mandatory fields!'
        })
        return;
    }
    var q = 'SELECT * FROM users WHERE users.email=$1'
    var param = [req.body.email];
    db.query(q, param).then(function(result) {
        if (result.rows[0]) {
            res.render('register', {
                csrfToken: req.csrfToken(),
                layout: 'main',
                error: 'This e-mail is already in use. Please log-in or enter another e-mail'
            })
        }else{
            hashPassword(req.body.password).then(function(hash) {
                var q = `INSERT INTO users (firstname,lastname,email,password) VALUES ($1,$2,$3,$4) RETURNING ID`
                var params = [req.body.firstname, req.body.lastname, req.body.email, hash]
                db.query(q, params).then(function(result) {
                    const id = result.rows[0].id
                    req.session.user = {
                        first: params[0],
                        last: params[1],
                        mail: params[2],
                        userId: id
                    }
                    res.redirect('/profile')
                }).catch(function(e) {
                    console.log('error at the end of register post')
                })
            })
        }
    })
})


app.get('/profile', function(req, res) {
    res.render('profile', {
        csrfToken: req.csrfToken(),
        layout: 'main'
    })
})

app.post('/insertProfile', function(req, res) {
    req.body.age === "" ? age = null : age = req.body.age;
    req.body.city === "" ? city = null : age = req.body.city;
    req.body.homepage === "" ? homepage = null : homepage = req.body.homepage;

    var params = [req.body.age, req.body.city, req.body.homepage, req.session.user.userId];
    var q = `INSERT INTO user_profiles (age,city,url,user_id) VALUES($1,$2,$3,$4) RETURNING ID;`
    db.query(q, params).then(function(result) {
        return result;
    })
    res.redirect('/petition')
})


app.get('/login', function(req, res) {
        res.render('register', {
            csrfToken: req.csrfToken(),
            layout: 'main'
        })

})

app.get('/errorLogin',function(req,res){
    res.render('errorLogin',{
        csrfToken: req.csrfToken(),
        layout:'main'
    })
})

app.post('/login', function(req, res) {
    var param = [req.body.email];
    var q = 'SELECT * FROM users WHERE email = $1'
    db.query(q, param).then(function(result) {
        if (!result.rows[0]) {
            res.render('errorLogin', {
                csrfToken: req.csrfToken(),
                layout: 'main',
                error: 'please insert a valid e-mail address'
            })
        }
        else{
        var data = result.rows[0]
        checkPassword(req.body.password, data.password).then(function(doesMatch) {
            if (!doesMatch) {
                res.render('errorLogin', {
                    csrfToken: req.csrfToken(),
                    layout: 'main',
                    error: 'the Password is not correct'
                })
            } else {
                req.session.user = {
                    first: data.firstname,
                    last: data.lastname,
                    mail: data.email,
                    userId: data.id
                }
                var param = [data.id];
                var q = 'SELECT id  FROM signatures WHERE user_id =$1'
                db.query(q, param)
                    .then(function(result) {
                        if (result.rows[0]) {
                            req.session.user.signatureId = result.rows[0].id
                            res.redirect('/thanks')
                        } else {
                            res.redirect('/petition')
                        }
                    }).catch(function(e) {
                        console.log(e)
                        })
               }
        })
    }
    }).catch(function(e) {
        console.log(e)
    })
})


app.get('/petition', function(req, res) {
    if(!req.session.user){
        res.redirect('/register')
    }
    else{
        if(req.session.user.signatureId){
            console.log(req.session.user.signatureId)
            res.redirect('/thanks')
        }
        else{
            res.render('petition', {
                csrfToken: req.csrfToken(),
                layout: 'main',
            })
        }
    }

})

app.get('/signers', function(req, res) {
    var q = `SELECT users.firstname, users.lastname,user_profiles.city,user_profiles.age,user_profiles.url
    FROM users
    LEFT JOIN user_profiles
    ON users.id = user_profiles.user_id
    JOIN signatures
    ON users.id = signatures.user_id;`
    db.query(q).then(function(result) {
        res.render('signers', {
            csrfToken: req.csrfToken(),
            layout: 'main',
            signers: result.rows,
            stocks: "https://cdn3.iconfinder.com/data/icons/wall-street/154/wall-street-pointer-location-512.png"
        })
    }).catch(function(e) {
        console.log(e)
    })
})

app.get('/signers/:cityName', function(req, res) {
    const city = req.params.cityName;
    const newCity = city.replace('%20', ' ')
    const q = `SELECT users.firstname, users.lastname, user_profiles.age,user_profiles.url
      FROM users
      JOIN user_profiles
      ON users.id=user_profiles.user_id
      WHERE user_profiles.city = $1;`
    const param = [newCity]
    db.query(q, param).then(function(result) {
        if(result.rows.length===1){
            res.render('firstSigner',{
                csrfToken: req.csrfToken(),
                layout: 'main',
                city: newCity
            })
        }
        else{
            res.render('signersPerCity',{
                csrfToken: req.csrfToken(),
                layout: 'main',
                list: result.rows,
                city: newCity
            })
        }
        }).catch(function(e) {
            console.log(e)
          })
})

app.post('/createNewSignature', function(req, res) {
    if(req.session.user.signatureId){
        res.redirect('/thanks')
    }
    else{
        var q = 'INSERT INTO signatures(signature,user_id) VALUES ($1,$2) RETURNING id;'
        var params = [req.body.signature, req.session.user.userId]
        db.query(q, params).then(function(result) {
            const id = result.rows[0].id
            req.session.user.signatureId = id
            res.redirect('/thanks')
        }).catch(function(e) {
            console.log(e)
        })

    }
})

app.get('/thanks', function(req, res) {
    if(!req.session.user){
        res.redirect('/register')
    }else{
        const count = `SELECT * FROM signatures`
        var countSign;
        db.query(count).then(function(result){return countSign= result.rowCount-1}).then(function(result){
            if (result<1){
                const q = `SELECT * FROM signatures WHERE id = $1`
                const params = [req.session.user.signatureId]
                db.query(q, params).then(function(result) {
                    res.render('thanks', {
                        csrfToken: req.csrfToken(),
                        layout: 'main',
                        thanksImg: 'https://danielmiessler.com/images/trickle-down-joke.png',
                        theimage: result.rows[0].signature,
                        congrats:'GREAT! You are the first to sign this petition'
                    })
                })
            }
            else{
                const q = `SELECT * FROM signatures WHERE id = $1`
                const params = [req.session.user.signatureId]
                db.query(q, params).then(function(result) {
                    res.render('thanks', {
                        csrfToken: req.csrfToken(),
                        layout: 'main',
                        thanksImg: 'https://danielmiessler.com/images/trickle-down-joke.png',
                        theimage: result.rows[0].signature,
                        numberSigners:countSign
                    })
                }).catch(function(e) {
                    console.log(e)
                   })
            }
        })
    }
})

app.get('/edit', function(req, res) {
    var param = [req.session.user.userId]
    var q = `SELECT users.firstname,users.lastname,users.email,user_profiles.age,user_profiles.city,user_profiles.url
    FROM users
    LEFT JOIN user_profiles
    ON user_profiles.user_id =users.id
    WHERE users.id=$1`
    db.query(q, param).then(function(result) {
        const data = result.rows[0]
        res.render('edit', {
            layout: 'main',
            csrfToken: req.csrfToken(),
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            age: data.age,
            city: data.city,
            homepage: data.url
        })
    }).catch(function(e) {
        console.log(e)
    })
})

app.post('/edit', function(req, res) {
    const data = req.body;
    var params, q;
    userId = req.session.user.userId
    if (data.password) {
        hashPassword(data.password).then(function(hash) {
            params = [data.firstname, data.lastname, data.email, hash, userId]
            q = `UPDATE users
            SET firstname =$1, lastname=$2, email=$3, password=$4
            WHERE users.id = $5 RETURNING password;`
            db.query(q, params).then(function(result) {
                db.query(q, params).then(function() {
                    var params = [data.age || null,
                        data.city || null,
                        data.homepage || null,
                        userId
                    ]
                    var q = `UPDATE user_profiles
                    SET age=$1, city=$2, url=$3
                    WHERE user_profiles.id = $4;`
                    db.query(q, params).then(function() {
                        res.redirect('/thanks')
                    })
                })

            }).catch(function(e) {
                console.log(e)
            })
        })
    } else {
        params = [
            data.firstname,
            data.lastname,
            data.email,
            userId,
        ]
        q = `UPDATE users
        SET firstname =$1, lastname=$2, email=$3
        WHERE users.id = $4;`
        db.query(q, params).then(function() {
            var params = [data.age || null,
                data.city || null,
                data.homepage || null,
                userId
            ]
            var q = `UPDATE user_profiles
            SET age=$1, city=$2, url=$3
            WHERE user_profiles.id = $4;`
            db.query(q, params).then(function() {
                res.redirect('/thanks')
            })
        }).catch(function(e) {
            console.log(e)
        })
    }

})

app.post('/deleteSignature', function(req, res) {
    const params = [req.session.user.userId]
    var q = `DELETE FROM signatures
    WHERE signatures.user_id = $1`
    db.query(q, params).then(function() {
        delete req.session.user.signatureId
        res.redirect('/petition')
    }).catch(function(e) {
        console.log(e)
    })
})


app.post('/logout', function(req, res) {
    csrfToken: req.csrfToken()
    req.session = null;
    res.redirect('/register')
});



function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}



function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}

app.listen(process.env.PORT || 8080, () => {
    console.log('listening on port 8080')
})
