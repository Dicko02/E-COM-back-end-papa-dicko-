module.exports.signUpErrors = (err) => {
    let errors = {}

    if (err.message.includes('pseudo'))
        errors= "Pseudo incorrect ou déjà pris";

    if (err.message.includes('email'))
        errors= "email incorrect";

    if (err.message.includes('password'))
        errors= "Le mot de passe doit faire 6 caractères minimum";

    if (err.code ==11000 && Object.keys(err.keyValue)[0].includes('pseudo'))
        errors= 'Cet pseudo est déjà pris';

    if (err.code ==11000 && Object.keys(err.keyValue)[0].includes('email'))
        errors= 'Cet email est déjà enregistré';

    return errors;
};

module.exports.signInErrors = (err) => {
    let errors = {}

    if (err.message.includes('email'))
        errors = 'Email inconnu'

    if (err.message.includes('password'))
        errors = "Le mot de passe ne correspond pas";

    return errors;
}

module.exports.uploadErrors = (err) => {
    let errors = {}
    if (err.message.includes('invalid file'))
        errors.format = "format invalide";

    if (err.message.includes('max size'))
        errors.maxSize = "trop gros";  
    
    return errors;
}