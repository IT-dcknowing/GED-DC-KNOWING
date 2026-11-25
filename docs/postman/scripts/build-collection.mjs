/**
 * Génère la collection et l'environnement Postman de GED-DC-KNOWING.
 *
 *   node docs/postman/scripts/build-collection.mjs
 *
 * Source unique : modifier ce fichier puis relancer la commande, ne pas éditer le JSON à la main.
 * Seules les routes réellement exposées par l'API (php artisan route:list --path=api) figurent ici.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ outils */

const test = (name, body) => `pm.test(${JSON.stringify(name)}, function () {\n${body}\n});`;
const status = (code) => test(`Code HTTP ${code}`, `    pm.response.to.have.status(${code});`);
const errorCode = (code) =>
    test(`Code d'erreur ${code}`, `    pm.expect(pm.response.json().code).to.eql(${JSON.stringify(code)});`);
const message = (fragment) =>
    test(`Message : « ${fragment} »`, `    pm.expect(pm.response.json().message).to.include(${JSON.stringify(fragment)});`);
const fieldError = (field, fragment) =>
    test(
        `Erreur sur le champ « ${field} »${fragment ? ` : « ${fragment} »` : ''}`,
        [
            '    const errors = pm.response.json().errors || {};',
            `    pm.expect(errors, 'erreurs de validation').to.have.property(${JSON.stringify(field)});`,
            fragment ? `    pm.expect(errors[${JSON.stringify(field)}].join(' ')).to.include(${JSON.stringify(fragment)});` : '',
        ]
            .filter(Boolean)
            .join('\n'),
    );
const profile = (role, mustChange) =>
    test(
        `Profil complet${role ? ` (rôle ${role})` : ''}`,
        [
            '    const d = pm.response.json().data;',
            "    pm.expect(d).to.include.all.keys('id', 'name', 'email', 'role', 'permissions', 'department', 'must_change_password', 'last_login_at');",
            "    pm.expect(d.permissions, 'permissions').to.be.an('array');",
            "    pm.expect(d, 'aucun mot de passe exposé').to.not.have.property('password');",
            role ? `    pm.expect(d.role.key).to.eql(${JSON.stringify(role)});` : '',
            mustChange === undefined ? '' : `    pm.expect(d.must_change_password, 'mot de passe à changer').to.eql(${mustChange});`,
        ]
            .filter(Boolean)
            .join('\n'),
    );
const policyCheck = (variable) =>
    test(
        'Mot de passe temporaire conforme à la politique (14 caractères, majuscule, minuscule, chiffre)',
        [
            `    const p = pm.response.json().temporary_password;`,
            "    pm.expect(p).to.be.a('string').with.lengthOf(14);",
            '    pm.expect(p).to.match(/[A-Z]/);',
            '    pm.expect(p).to.match(/[a-z]/);',
            '    pm.expect(p).to.match(/[0-9]/);',
            `    pm.collectionVariables.set(${JSON.stringify(variable)}, p);`,
        ].join('\n'),
    );

/** Rejoue la même requête jusqu'à `times` fois pendant une exécution (Runner ou Postman CLI). */
const loop = (times) =>
    [
        "const done = Number(pm.collectionVariables.get('loop_count') || 0) + 1;",
        `if (done < ${times}) {`,
        "    pm.collectionVariables.set('loop_count', done);",
        '    if (pm.execution && pm.execution.setNextRequest) { pm.execution.setNextRequest(pm.info.requestName); }',
        '    else { postman.setNextRequest(pm.info.requestName); }',
        '} else {',
        "    pm.collectionVariables.set('loop_count', 0);",
        '}',
    ].join('\n');

/** Ignore la requête (sans la compter comme réussie) tant que le jeton de réinitialisation n'est pas renseigné. */
const skipWithoutResetToken = [
    "if (!pm.environment.get('reset_token')) {",
    "    console.log('Requête ignorée : renseignez la variable reset_token (voir le guide, étape manuelle).');",
    '    pm.execution.skipRequest();',
    '}',
].join('\n');

const auditEntry = (result) =>
    [
        status(200),
        "const body = pm.response.json();",
        test('Au moins une entrée trouvée', "    pm.expect(body.data).to.be.an('array').that.is.not.empty;"),
        'const entry = body.data[0] || {};',
        test(
            'Entrée produite par cette exécution',
            [
                "    const start = pm.collectionVariables.get('run_started_at');",
                '    if (start) {',
                '        // Marge de 2 minutes pour un éventuel décalage d\'horloge entre Postman et le serveur.',
                '        pm.expect(new Date(entry.occurred_at).getTime()).to.be.at.least(new Date(start).getTime() - 120000);',
                '    }',
            ].join('\n'),
        ),
        test(
            "Date et heure, adresse e-mail et adresse IP présentes",
            [
                "    pm.expect(entry.occurred_at).to.be.a('string').and.not.empty;",
                "    pm.expect(entry.email).to.be.a('string').and.not.empty;",
                "    pm.expect(entry.ip).to.be.a('string').and.not.empty;",
            ].join('\n'),
        ),
        test(`Résultat « ${result} »`, `    pm.expect(entry.result).to.eql(${JSON.stringify(result)});`),
    ].join('\n');

const json = (body) => ({ mode: 'raw', raw: JSON.stringify(body, null, 4), options: { raw: { language: 'json' } } });

function request(name, method, path, { body, pre, tests, description } = {}) {
    const event = [];
    if (pre) event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: pre.split('\n') } });
    if (tests) event.push({ listen: 'test', script: { type: 'text/javascript', exec: tests.split('\n') } });

    return {
        name,
        event,
        request: {
            method,
            header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
            url: `{{base_url}}${path}`,
            ...(body ? { body: json(body) } : {}),
            ...(description ? { description } : {}),
        },
    };
}

const folder = (name, description, item) => ({ name, description, item });

const LOGIN = '/api/v1/auth/login';
const login = (email, password) => ({ email: `{{${email}}}`, password: `{{${password}}}` });
const genericFailure = [status(422), fieldError('email', 'Adresse e-mail ou mot de passe incorrect.')].join('\n');

/* -------------------------------------------------------------- requêtes */

const preparation = folder(
    '00 · Préparation',
    "Vérifie que l'API répond, obtient le cookie CSRF de Sanctum et ferme une éventuelle session laissée par une exécution précédente.",
    [
        request("00.1 Santé de l'API", 'GET', '/api/v1/health', {
            pre: [
                "pm.collectionVariables.set('run_started_at', new Date().toISOString());",
                "pm.collectionVariables.set('loop_count', 0);",
            ].join('\n'),
            tests: [
                status(200),
                test('API et base de données opérationnelles', [
                    '    const b = pm.response.json();',
                    "    pm.expect(b.status).to.eql('ok');",
                    "    pm.expect(b.database).to.eql('ok');",
                ].join('\n')),
            ].join('\n'),
        }),
        request('00.2 Cookie CSRF (Sanctum)', 'GET', '/sanctum/csrf-cookie', {
            tests: [
                status(204),
                test('Jeton XSRF récupéré', "    pm.expect(pm.collectionVariables.get('xsrf_token')).to.be.a('string').and.not.empty;"),
            ].join('\n'),
        }),
        request("00.3 Fermeture d'une session précédente", 'POST', '/api/v1/auth/logout', {
            tests: test('Aucune session ouverte après cette requête (204 ou 401)', '    pm.expect(pm.response.code).to.be.oneOf([204, 401]);'),
        }),
    ],
);

const withoutSession = folder(
    '01 · Accès sans session (E4, H1)',
    'Les routes protégées refusent toute requête sans session ; aucune inscription publique n\'existe.',
    [
        request('01.1 Profil sans session (E4)', 'GET', '/api/v1/auth/me', {
            tests: [status(401), errorCode('UNAUTHENTICATED'), message('Reconnectez-vous')].join('\n'),
        }),
        request('01.2 Administration sans session (E4)', 'GET', '/api/v1/admin/users', {
            tests: [status(401), errorCode('UNAUTHENTICATED')].join('\n'),
        }),
        request("01.3 Journal d'audit sans session (E4)", 'GET', '/api/v1/admin/audit-logs', {
            tests: [status(401), errorCode('UNAUTHENTICATED')].join('\n'),
        }),
        request('01.4 Changement de mot de passe sans session (C5)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: 'x', password: 'x', password_confirmation: 'x' },
            tests: [status(401), errorCode('UNAUTHENTICATED')].join('\n'),
        }),
        request("01.5 Pas d'inscription publique (H1)", 'POST', '/api/v1/auth/register', {
            body: { name: 'Inconnu', email: '{{unknown_email}}', password: 'Inscription2026' },
            tests: [status(404), errorCode('NOT_FOUND')].join('\n'),
        }),
    ],
);

const connexion = folder(
    '02 · Connexion (A1 à A7, E2, E4, F1, F5)',
    'Connexion, messages d\'erreur, remise à zéro du compteur d\'échecs, profil, contrôle des permissions et déconnexion.',
    [
        request('02.1 Champs manquants (A2, A3)', 'POST', LOGIN, {
            body: {},
            tests: [status(422), fieldError('email', 'Saisissez votre adresse e-mail.'), fieldError('password', 'Saisissez votre mot de passe.')].join('\n'),
        }),
        request('02.2 Mot de passe incorrect (A3, A4)', 'POST', LOGIN, {
            body: { email: '{{standard_email}}', password: 'Mauvais2026x' },
            tests: [genericFailure, "pm.collectionVariables.set('invalid_credentials_body', pm.response.text());"].join('\n'),
        }),
        request('02.3 Adresse inconnue : réponse identique (A4)', 'POST', LOGIN, {
            body: { email: '{{unknown_email}}', password: 'Mauvais2026x' },
            tests: [
                genericFailure,
                test('Réponse strictement identique à celle d\'un mot de passe incorrect', "    pm.expect(pm.response.text()).to.eql(pm.collectionVariables.get('invalid_credentials_body'));"),
            ].join('\n'),
        }),
        request('02.4 Sans en-tête Referer : refus explicite', 'POST', LOGIN, {
            description: 'Sans en-tête Referer (ou Origin) d\'un domaine autorisé, Laravel n\'ouvre pas de session : la connexion est refusée avant toute vérification.',
            pre: ["pm.request.headers.remove('Referer');", "pm.request.headers.remove('X-XSRF-TOKEN');"].join('\n'),
            body: login('standard_email', 'standard_password'),
            tests: [status(400), errorCode('SESSION_REQUIRED')].join('\n'),
        }),
        request('02.5 Trois échecs supplémentaires (A6, préparation)', 'POST', LOGIN, {
            description: 'Rejouée 3 fois pendant une exécution : avec 02.2, le compte standard cumule 4 échecs consécutifs.',
            body: { email: '{{standard_email}}', password: 'Mauvais2026x' },
            tests: [genericFailure, loop(3)].join('\n'),
        }),
        request('02.6 Connexion réussie (A1, A2, A7)', 'POST', LOGIN, {
            body: login('standard_email', 'standard_password'),
            tests: [
                status(200),
                profile('collaborateur', false),
                test('Autorisations chargées (A7)', [
                    '    const p = pm.response.json().data.permissions;',
                    "    pm.expect(p).to.include('documents.upload');",
                    "    pm.expect(p).to.not.include('documents.validate');",
                ].join('\n')),
                "pm.environment.set('user_id', pm.response.json().data.id);",
            ].join('\n'),
        }),
        request("02.7 Profil de l'utilisateur connecté", 'GET', '/api/v1/auth/me', {
            tests: [
                status(200),
                profile('collaborateur', false),
                test('Même utilisateur que celui connecté', "    pm.expect(String(pm.response.json().data.id)).to.eql(String(pm.environment.get('user_id')));"),
            ].join('\n'),
        }),
        request('02.8 Administration refusée sans permission (E4)', 'GET', '/api/v1/admin/users', {
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('02.9 Journal refusé sans permission (E4)', 'GET', '/api/v1/admin/audit-logs', {
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('02.10 Déconnexion (E2, F5)', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
        request('02.11 Profil après déconnexion (E2)', 'GET', '/api/v1/auth/me', {
            tests: [status(401), errorCode('UNAUTHENTICATED')].join('\n'),
        }),
        request('02.12 Compteur remis à zéro après la connexion réussie (A6)', 'POST', LOGIN, {
            description: 'Sans remise à zéro, ce serait le 5e échec consécutif et le compte serait verrouillé.',
            body: { email: '{{standard_email}}', password: 'Mauvais2026x' },
            tests: genericFailure,
        }),
    ],
);

const disabled = folder('03 · Compte désactivé (A3, E3)', 'Un compte désactivé ne peut pas se connecter.', [
    request("03.1 Connexion d'un compte désactivé (A3, E3)", 'POST', LOGIN, {
        body: login('inactive_email', 'inactive_password'),
        tests: [status(422), fieldError('email', 'Ce compte est désactivé.')].join('\n'),
    }),
]);

const lockout = folder(
    '04 · Verrouillage (A5, F2)',
    'Cinq échecs consécutifs verrouillent l\'adresse pendant 15 minutes, même avec le bon mot de passe. Le compte est déverrouillé en 05.5.',
    [
        request('04.1 Quatre échecs consécutifs (A5)', 'POST', LOGIN, {
            description: 'Rejouée 4 fois pendant une exécution.',
            body: { email: '{{lockout_email}}', password: 'Mauvais2026x' },
            tests: [genericFailure, loop(4)].join('\n'),
        }),
        request('04.2 Cinquième échec : verrouillage (A5, F2)', 'POST', LOGIN, {
            body: { email: '{{lockout_email}}', password: 'Mauvais2026x' },
            tests: [status(422), fieldError('email', 'bloquée pendant 15 minutes')].join('\n'),
        }),
        request('04.3 Bon mot de passe pendant le verrouillage (A5)', 'POST', LOGIN, {
            body: login('lockout_email', 'lockout_password'),
            tests: [status(422), fieldError('email', 'bloquée pendant 15 minutes')].join('\n'),
        }),
    ],
);

const administration = folder(
    '05 · Administration des comptes (B1, B2, E3, G1)',
    'Réservé au Super Administrateur : listes de référence, création avec mot de passe temporaire, rôle, activation, déverrouillage.',
    [
        request('05.1 Connexion du Super Administrateur', 'POST', LOGIN, {
            body: login('admin_email', 'admin_password'),
            tests: [status(200), profile('super_admin', false), "pm.collectionVariables.set('admin_id', pm.response.json().data.id);"].join('\n'),
        }),
        request('05.2 Liste des rôles avec permissions et nombre de comptes', 'GET', '/api/v1/admin/roles', {
            tests: [
                status(200),
                test('Les 7 rôles avec libellé, description, permissions et nombre de comptes', [
                    '    const roles = pm.response.json().data;',
                    '    pm.expect(roles).to.have.lengthOf(7);',
                    '    roles.forEach(r => {',
                    "        pm.expect(r).to.have.all.keys('key', 'label', 'description', 'users_count', 'permissions');",
                    "        pm.expect(r.description).to.be.a('string').and.not.empty;",
                    "        pm.expect(r.users_count).to.be.a('number').and.at.least(0);",
                    "        r.permissions.forEach(p => pm.expect(p).to.have.all.keys('key', 'label'));",
                    '    });',
                ].join('\n')),
                test('Catalogue des 17 permissions, cohérent avec celles des rôles', [
                    '    const body = pm.response.json();',
                    '    const all = body.meta.permissions.map(p => p.key);',
                    '    pm.expect(all).to.have.lengthOf(17);',
                    '    body.data.forEach(r => r.permissions.forEach(p => pm.expect(all).to.include(p.key)));',
                    "    const admin = body.data.find(r => r.key === 'super_admin');",
                    '    pm.expect(admin.permissions, \'le Super Administrateur a toutes les permissions\').to.have.lengthOf(17);',
                    "    pm.expect(admin.users_count, 'au moins le compte Postman').to.be.at.least(1);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('05.3 Liste des départements', 'GET', '/api/v1/admin/departments', {
            tests: [status(200), test('Liste de départements', "    pm.expect(pm.response.json().data).to.be.an('array');")].join('\n'),
        }),
        request('05.4 Compte verrouillé visible dans la liste (A5, F2)', 'GET', '/api/v1/admin/users?search={{lockout_email}}', {
            tests: [
                status(200),
                test('Liste paginée', "    pm.expect(pm.response.json()).to.include.all.keys('data', 'meta', 'links');"),
                test('Le compte apparaît verrouillé', [
                    '    const u = pm.response.json().data[0];',
                    "    pm.expect(u.email).to.eql(pm.environment.get('lockout_email'));",
                    "    pm.expect(u.locked_until, 'fin du verrouillage').to.be.a('string');",
                    "    pm.collectionVariables.set('lockout_user_id', u.id);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('05.4b Recherche : « % » cherché tel quel (A2)', 'GET', '/api/v1/admin/users?search=%25', {
            description: 'Le caractère « % » saisi n\'est pas un joker : seuls les comptes dont le nom ou l\'adresse contient « % » sont renvoyés.',
            tests: [
                status(200),
                test('Aucun compte renvoyé sans « % » dans son nom ou son adresse', [
                    '    pm.response.json().data.forEach(u => pm.expect(u.name + u.email).to.include(\'%\'));',
                ].join('\n')),
            ].join('\n'),
        }),
        request('05.5 Déverrouillage du compte (A5)', 'POST', '/api/v1/admin/users/{{lockout_user_id}}/unlock', {
            tests: [status(200), message('déverrouillé')].join('\n'),
        }),
        request('05.6 Création refusée : données invalides', 'POST', '/api/v1/admin/users', {
            body: { name: '', email: '{{admin_email}}', role: 'role-inexistant' },
            tests: [status(422), fieldError('name'), fieldError('email', 'existe déjà'), fieldError('role')].join('\n'),
        }),
        request("05.7 Création d'un compte (B1, B2)", 'POST', '/api/v1/admin/users', {
            pre: "pm.collectionVariables.set('created_user_email', 'postman.cree.' + Date.now() + '@postman.test');",
            body: { name: 'Postman · Compte créé', email: '{{created_user_email}}', role: 'collaborateur' },
            tests: [
                status(201),
                test('Compte actif, mot de passe à changer à la première connexion', [
                    '    const d = pm.response.json().data;',
                    "    pm.expect(d.email).to.eql(pm.collectionVariables.get('created_user_email'));",
                    '    pm.expect(d.is_active).to.eql(true);',
                    '    pm.expect(d.must_change_password).to.eql(true);',
                    "    pm.collectionVariables.set('created_user_id', d.id);",
                ].join('\n')),
                test('Créateur du compte renseigné (A4)', "    pm.expect(String(pm.response.json().data.created_by.id)).to.eql(String(pm.collectionVariables.get('admin_id')));"),
                policyCheck('temporary_password'),
            ].join('\n'),
        }),
        request("05.8 Le mot de passe temporaire n'est plus renvoyé (B2)", 'GET', '/api/v1/admin/users/{{created_user_id}}', {
            tests: [
                status(200),
                test('Aucun mot de passe dans la fiche', "    pm.expect(pm.response.text()).to.not.include('temporary_password');\n    pm.expect(pm.response.json().data).to.not.have.property('password');"),
                test('Date et auteur de la création affichés (A4)', [
                    '    const d = pm.response.json().data;',
                    "    pm.expect(d.created_at).to.be.a('string').and.not.empty;",
                    "    pm.expect(d.created_by).to.have.all.keys('id', 'name');",
                    "    pm.expect(String(d.created_by.id)).to.eql(String(pm.collectionVariables.get('admin_id')));",
                ].join('\n')),
            ].join('\n'),
        }),
        request('05.9 Changement de rôle (E3)', 'PATCH', '/api/v1/admin/users/{{created_user_id}}', {
            body: { role: 'stagiaire' },
            tests: [status(200), test('Nouveau rôle appliqué', "    pm.expect(pm.response.json().data.role.key).to.eql('stagiaire');")].join('\n'),
        }),
        request("05.10 Désactivation d'un compte (E3)", 'POST', '/api/v1/admin/users/{{created_user_id}}/deactivate', {
            tests: [status(200), test('Compte désactivé', '    pm.expect(pm.response.json().data.is_active).to.eql(false);')].join('\n'),
        }),
        request('05.11 Interdiction de désactiver son propre compte (G1)', 'POST', '/api/v1/admin/users/{{admin_id}}/deactivate', {
            tests: [status(422), fieldError('user', 'propre compte')].join('\n'),
        }),
        request('05.11b Interdiction de modifier son propre rôle (A1)', 'PATCH', '/api/v1/admin/users/{{admin_id}}', {
            body: { role: 'directeur' },
            tests: [status(422), fieldError('role', 'Vous ne pouvez pas modifier votre propre rôle.')].join('\n'),
        }),
        request("05.12 Réactivation d'un compte", 'POST', '/api/v1/admin/users/{{created_user_id}}/activate', {
            tests: [status(200), test('Compte réactivé', '    pm.expect(pm.response.json().data.is_active).to.eql(true);')].join('\n'),
        }),
        request('05.13 Nouveau mot de passe temporaire (B2, B3)', 'POST', '/api/v1/admin/users/{{created_user_id}}/reset-password', {
            tests: [status(200), policyCheck('temporary_password'), message('sessions de ce compte ont été fermées')].join('\n'),
        }),
        request('05.14 Déconnexion du Super Administrateur', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
    ],
);

const afterUnlock = folder('06 · Après déverrouillage (A5)', 'Le compte déverrouillé par l\'administrateur peut de nouveau se connecter.', [
    request('06.1 Connexion du compte déverrouillé (A5)', 'POST', LOGIN, {
        body: login('lockout_email', 'lockout_password'),
        tests: [status(200), profile('collaborateur', false)].join('\n'),
    }),
    request('06.2 Déconnexion du compte déverrouillé', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
]);

const firstLogin = folder(
    '07 · Première connexion et politique des mots de passe (B3, B4, C1, C2, C4, C5, F4)',
    'Le mot de passe temporaire doit être changé avant tout accès ; la politique et l\'historique sont vérifiés par le serveur.',
    [
        request('07.1 Connexion avec le mot de passe temporaire (B3)', 'POST', LOGIN, {
            body: login('first_login_email', 'first_login_password'),
            tests: [status(200), profile('collaborateur', true)].join('\n'),
        }),
        request('07.2 Autres fonctionnalités bloquées (B4)', 'GET', '/api/v1/admin/audit-logs', {
            tests: [status(403), errorCode('PASSWORD_CHANGE_REQUIRED')].join('\n'),
        }),
        request('07.3 Profil accessible pendant le changement obligatoire (B4)', 'GET', '/api/v1/auth/me', {
            tests: [status(200), profile('collaborateur', true)].join('\n'),
        }),
        request('07.4 Mot de passe actuel incorrect (C5)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: 'Faux2026Secret', password: '{{first_login_new_password}}', password_confirmation: '{{first_login_new_password}}' },
            tests: [status(422), fieldError('current_password', 'Le mot de passe actuel est incorrect.')].join('\n'),
        }),
        request('07.5 Moins de 10 caractères (C1)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: '{{first_login_password}}', password: 'Court1Ab', password_confirmation: 'Court1Ab' },
            tests: [status(422), fieldError('password', 'au moins 10 caractères')].join('\n'),
        }),
        request('07.6 Sans majuscule ni chiffre (C2)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: '{{first_login_password}}', password: 'minusculesseulement', password_confirmation: 'minusculesseulement' },
            tests: [status(422), fieldError('password', 'majuscule'), fieldError('password', 'chiffre')].join('\n'),
        }),
        request('07.7 Réutilisation du mot de passe actuel (C4)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: '{{first_login_password}}', password: '{{first_login_password}}', password_confirmation: '{{first_login_password}}' },
            tests: [status(422), fieldError('password', '3 derniers mots de passe')].join('\n'),
        }),
        request('07.8 Choix du nouveau mot de passe (B3, C5, F4)', 'PUT', '/api/v1/auth/password', {
            body: { current_password: '{{first_login_password}}', password: '{{first_login_new_password}}', password_confirmation: '{{first_login_new_password}}' },
            tests: [status(200), profile('collaborateur', false)].join('\n'),
        }),
        request('07.9 Accès rétabli après le changement (B4)', 'GET', '/api/v1/admin/audit-logs', {
            description: 'Le blocage « mot de passe à changer » est levé ; la permission manquante du rôle Collaborateur s\'applique désormais (FORBIDDEN).',
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('07.10 Déconnexion après la première connexion', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
    ],
);

const changePassword = folder('08 · Modification du mot de passe (C5, F4)', 'Depuis le profil, avec vérification du mot de passe actuel.', [
    request('08.1 Connexion du compte standard', 'POST', LOGIN, {
        body: login('standard_email', 'standard_password'),
        tests: status(200),
    }),
    request('08.2 Modification du mot de passe depuis le profil (C5)', 'PUT', '/api/v1/auth/password', {
        body: { current_password: '{{standard_password}}', password: '{{new_password}}', password_confirmation: '{{new_password}}' },
        tests: [status(200), profile('collaborateur', false)].join('\n'),
    }),
    request('08.3 Déconnexion après la modification', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
    request("08.4 L'ancien mot de passe est refusé", 'POST', LOGIN, {
        body: login('standard_email', 'standard_password'),
        tests: genericFailure,
    }),
    request('08.5 Connexion avec le nouveau mot de passe', 'POST', LOGIN, {
        body: login('standard_email', 'new_password'),
        tests: [status(200), profile('collaborateur', false)].join('\n'),
    }),
    request('08.6 Déconnexion du compte standard', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
]);

const forgot = folder(
    '09 · Mot de passe oublié (D1, D3, D4, F3)',
    'Demande de lien (réponse identique dans tous les cas) et refus d\'un lien invalide. La requête 09.3 envoie un e-mail au compte postman.reinit@postman.test : son jeton sert au dossier 11 (étape manuelle).',
    [
        request('09.1 Adresse invalide (D1)', 'POST', '/api/v1/auth/forgot-password', {
            body: { email: 'pas-une-adresse' },
            tests: [status(422), fieldError('email', "n'est pas valide")].join('\n'),
        }),
        request('09.2 Demande pour une adresse inconnue (D3)', 'POST', '/api/v1/auth/forgot-password', {
            body: { email: '{{unknown_email}}' },
            tests: [
                status(200),
                message('Si un compte actif correspond à cette adresse'),
                "pm.collectionVariables.set('forgot_response', pm.response.text());",
            ].join('\n'),
        }),
        request('09.3 Demande pour un compte actif (D1, D2, D3, F3)', 'POST', '/api/v1/auth/forgot-password', {
            body: { email: '{{reset_email}}' },
            tests: [
                status(200),
                test('Réponse identique à celle d\'une adresse inconnue (D3)', "    pm.expect(pm.response.text()).to.eql(pm.collectionVariables.get('forgot_response'));"),
            ].join('\n'),
        }),
        request('09.4 Demande pour un compte désactivé (D3)', 'POST', '/api/v1/auth/forgot-password', {
            body: { email: '{{inactive_email}}' },
            tests: [
                status(200),
                test('Réponse identique (D3)', "    pm.expect(pm.response.text()).to.eql(pm.collectionVariables.get('forgot_response'));"),
            ].join('\n'),
        }),
        request('09.5 Lien invalide refusé (D4)', 'POST', '/api/v1/auth/reset-password', {
            body: { token: 'jeton-invalide', email: '{{reset_email}}', password: '{{reset_new_password}}', password_confirmation: '{{reset_new_password}}' },
            tests: [status(422), fieldError('token', 'invalide ou a expiré')].join('\n'),
        }),
    ],
);

const manualReset = folder(
    '11 · [Manuel] Réinitialisation avec le lien reçu (D2, D4, D6)',
    [
        'Étape manuelle, à exécuter SEULE après une exécution complète :',
        '1. Ouvrir storage/logs/laravel.log et copier la valeur « token » du dernier lien « /reinitialisation?token=…&email=postman.reinit%40postman.test ».',
        '2. La coller dans la variable d\'environnement reset_token.',
        '3. Exécuter uniquement ce dossier (ne pas relancer le dossier 09, qui demanderait un nouveau lien et invaliderait le jeton).',
        'Sans jeton, ces requêtes sont ignorées : elles ne sont pas comptées comme réussies.',
    ].join('\n'),
    [
        request('11.0 Cookie CSRF (étape manuelle)', 'GET', '/sanctum/csrf-cookie', {
            description: 'Ce dossier est exécuté seul : il obtient son propre cookie CSRF.',
            tests: status(204),
        }),
        request('11.1 Réinitialisation avec le lien reçu (D2, D4, D6)', 'POST', '/api/v1/auth/reset-password', {
            pre: skipWithoutResetToken,
            body: { token: '{{reset_token}}', email: '{{reset_email}}', password: '{{reset_new_password}}', password_confirmation: '{{reset_new_password}}' },
            tests: [status(200), message('réinitialisé')].join('\n'),
        }),
        request('11.2 Lien déjà utilisé refusé (D4)', 'POST', '/api/v1/auth/reset-password', {
            pre: skipWithoutResetToken,
            body: { token: '{{reset_token}}', email: '{{reset_email}}', password: 'Encore2026Secret', password_confirmation: 'Encore2026Secret' },
            tests: [status(422), fieldError('token', 'invalide ou a expiré')].join('\n'),
        }),
        request('11.3 Connexion avec le mot de passe réinitialisé (D2)', 'POST', LOGIN, {
            pre: skipWithoutResetToken,
            body: login('reset_email', 'reset_new_password'),
            tests: [status(200), profile('collaborateur', false)].join('\n'),
        }),
        request('11.4 Déconnexion après la réinitialisation', 'POST', '/api/v1/auth/logout', {
            pre: skipWithoutResetToken,
            tests: status(204),
        }),
    ],
);

const audit = folder(
    "10 · Journal d'audit (E4, F1 à F5)",
    'Consultation par le Directeur (permission journal.view). Chaque contrôle vérifie que l\'entrée la plus récente date de cette exécution.',
    [
        request('10.1 Connexion du Directeur', 'POST', LOGIN, {
            body: login('director_email', 'director_password'),
            tests: [status(200), profile('directeur', false)].join('\n'),
        }),
        request('10.2 Administration des comptes refusée au Directeur (E4)', 'GET', '/api/v1/admin/users', {
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('10.3 Journal : connexions réussies (F1)', 'GET', '/api/v1/admin/audit-logs?event=auth.login.succeeded&email={{standard_email}}', {
            tests: auditEntry('success'),
        }),
        request('10.4 Journal : connexions échouées (F1)', 'GET', '/api/v1/admin/audit-logs?event=auth.login.failed&email={{unknown_email}}', {
            tests: auditEntry('failure'),
        }),
        request('10.5 Journal : verrouillage (F2)', 'GET', '/api/v1/admin/audit-logs?event=auth.account.locked&email={{lockout_email}}', {
            tests: auditEntry('failure'),
        }),
        request('10.6 Journal : demande de réinitialisation (F3)', 'GET', '/api/v1/admin/audit-logs?event=auth.password.reset.requested&email={{reset_email}}', {
            tests: auditEntry('success'),
        }),
        request('10.7 Journal : modification du mot de passe (F4)', 'GET', '/api/v1/admin/audit-logs?event=auth.password.changed&result=success&email={{first_login_email}}', {
            tests: auditEntry('success'),
        }),
        request('10.8 Journal : déconnexion (F5)', 'GET', '/api/v1/admin/audit-logs?event=auth.logout&email={{standard_email}}', {
            tests: auditEntry('success'),
        }),
        request('10.9 Aucun mot de passe dans le journal', 'GET', '/api/v1/admin/audit-logs', {
            tests: [
                status(200),
                test('Aucun des mots de passe utilisés par les tests n\'apparaît', [
                    '    const text = pm.response.text();',
                    "    ['standard_password', 'new_password', 'first_login_password', 'first_login_new_password', 'lockout_password', 'reset_new_password']",
                    '        .map(k => pm.environment.get(k)).filter(Boolean)',
                    '        .forEach(p => pm.expect(text).to.not.include(p));',
                    "    const temp = pm.collectionVariables.get('temporary_password');",
                    '    if (temp) { pm.expect(text).to.not.include(temp); }',
                ].join('\n')),
            ].join('\n'),
        }),
        request('10.10 Déconnexion du Directeur', 'POST', '/api/v1/auth/logout', { tests: status(204) }),
    ],
);

/* ------------------------------------------------- départements (lot 1.3) */

const logout = (name) => request(name, 'POST', '/api/v1/auth/logout', { tests: status(204) });

/** Entrée la plus récente du journal pour un événement de département, produite par cette exécution. */
const departmentAuditEntry = (event, check) =>
    [
        status(200),
        'const entry = pm.response.json().data[0] || {};',
        test(`Entrée « ${event} » produite par cette exécution`, [
            `    pm.expect(entry.event && entry.event.key).to.eql(${JSON.stringify(event)});`,
            "    const start = pm.collectionVariables.get('run_started_at');",
            '    if (start) { pm.expect(new Date(entry.occurred_at).getTime()).to.be.at.least(new Date(start).getTime() - 120000); }',
        ].join('\n')),
        test('Auteur et département renseignés', [
            "    pm.expect(String(entry.actor && entry.actor.id)).to.eql(String(pm.collectionVariables.get('admin_id')));",
            "    pm.expect(entry.details.department.code).to.eql(pm.collectionVariables.get('dep_code'));",
            check ?? '',
        ].filter(Boolean).join('\n')),
    ].join('\n');

const departments = folder(
    'DÉPARTEMENTS (lot 1.3)',
    'Consultation selon le rôle (D1), gestion par le Super Administrateur (D2), responsable (D4), désactivation (D6), code (D7). '
        + 'Les départements créés ici ont un code « PM-… », effacé à chaque remise à zéro des comptes de test.',
    [
        // Rend le dossier exécutable seul (option -i), sans dépendre du dossier 00 de l'authentification.
        request('DEP.00 Cookie CSRF (Sanctum)', 'GET', '/sanctum/csrf-cookie', {
            pre: "if (!pm.collectionVariables.get('run_started_at')) { pm.collectionVariables.set('run_started_at', new Date().toISOString()); }",
            tests: [
                status(204),
                test('Jeton XSRF récupéré', "    pm.expect(pm.collectionVariables.get('xsrf_token')).to.be.a('string').and.not.empty;"),
            ].join('\n'),
        }),
        request('DEP.00b Fermeture d\'une session précédente', 'POST', '/api/v1/auth/logout', {
            tests: test('Aucune session ouverte après cette requête (204 ou 401)', '    pm.expect(pm.response.code).to.be.oneOf([204, 401]);'),
        }),
        request('DEP.01 Connexion du Directeur', 'POST', LOGIN, {
            body: login('director_email', 'director_password'),
            tests: [status(200), profile('directeur', false)].join('\n'),
        }),
        request('DEP.02 Liste de tous les départements (D1)', 'GET', '/api/v1/departments', {
            tests: [
                status(200),
                test('Départements avec code, nom, état, responsable et nombre de collaborateurs actifs', [
                    '    const list = pm.response.json().data;',
                    "    pm.expect(list).to.be.an('array').that.is.not.empty;",
                    "    list.forEach(d => pm.expect(d).to.include.all.keys('id', 'code', 'name', 'is_active', 'manager', 'active_members_count', 'created_at'));",
                    "    list.forEach(d => pm.expect(d, 'pas de liste de membres dans la liste').to.not.have.property('members'));",
                ].join('\n')),
                test('Département de test présent, avec son responsable', [
                    "    const dep = pm.response.json().data.find(d => d.code === 'DEP-TEST');",
                    "    pm.expect(dep, 'DEP-TEST').to.be.an('object');",
                    "    pm.expect(dep.manager.name).to.include('Responsable de Département');",
                    "    pm.collectionVariables.set('dep_test_id', dep.id);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('DEP.03 Création refusée au Directeur (D2)', 'POST', '/api/v1/departments', {
            body: { code: 'PM-REFUS', name: 'Postman · Refus' },
            tests: [status(403), errorCode('FORBIDDEN'), message('pas les droits')].join('\n'),
        }),
        logout('DEP.04 Déconnexion du Directeur'),
        request('DEP.05 Connexion du Responsable de Département', 'POST', LOGIN, {
            body: login('dept_manager_email', 'dept_manager_password'),
            tests: [status(200), profile('resp_dept', false)].join('\n'),
        }),
        request('DEP.06 Liste limitée à son département (D1)', 'GET', '/api/v1/departments', {
            tests: [
                status(200),
                test('Un seul département : le sien', [
                    '    const list = pm.response.json().data;',
                    '    pm.expect(list).to.have.lengthOf(1);',
                    "    pm.expect(list[0].code).to.eql('DEP-TEST');",
                ].join('\n')),
            ].join('\n'),
        }),
        request('DEP.07 Détail de son département avec ses collaborateurs', 'GET', '/api/v1/departments/{{dep_test_id}}', {
            tests: [
                status(200),
                test('Collaborateurs avec rôle, état et indicateur de responsable', [
                    '    const members = pm.response.json().data.members;',
                    "    pm.expect(members).to.be.an('array').that.is.not.empty;",
                    "    members.forEach(m => pm.expect(m).to.have.all.keys('id', 'name', 'role', 'is_active', 'is_manager'));",
                    '    const manager = members.find(m => m.is_manager);',
                    "    pm.expect(manager.role.key).to.eql('resp_dept');",
                    "    pm.collectionVariables.set('dept_manager_id', manager.id);",
                    "    const collaborator = members.find(m => m.is_active && m.role && m.role.key === 'collaborateur');",
                    "    pm.collectionVariables.set('collab_member_id', collaborator.id);",
                ].join('\n')),
            ].join('\n'),
        }),
        logout('DEP.08 Déconnexion du Responsable de Département'),
        // Compte collaborateur dont le mot de passe n'est jamais modifié par la collection
        // (celui de standard_email change au dossier 08) ; verrouillé au dossier 04, il est déverrouillé en 05.5.
        request('DEP.09 Connexion du collaborateur', 'POST', LOGIN, {
            body: login('lockout_email', 'lockout_password'),
            tests: [status(200), profile('collaborateur', false)].join('\n'),
        }),
        request('DEP.10 Liste refusée au collaborateur (D1)', 'GET', '/api/v1/departments', {
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        logout('DEP.11 Déconnexion du collaborateur'),
        request('DEP.12 Connexion du Super Administrateur', 'POST', LOGIN, {
            body: login('admin_email', 'admin_password'),
            tests: [status(200), profile('super_admin', false), "pm.collectionVariables.set('admin_id', pm.response.json().data.id);"].join('\n'),
        }),
        request('DEP.13 Création refusée : code et nom invalides (D7)', 'POST', '/api/v1/departments', {
            body: { code: 'PM_01 invalide', name: '' },
            tests: [status(422), fieldError('code', 'lettres majuscules, des chiffres et des tirets'), fieldError('name')].join('\n'),
        }),
        request("DEP.14 Création d'un département (D2, D7)", 'POST', '/api/v1/departments', {
            pre: [
                "const code = 'PM-' + Date.now().toString(36).toUpperCase().slice(-8);",
                "pm.collectionVariables.set('dep_code', code);",
                "pm.collectionVariables.set('dep_code_input', code.toLowerCase());",
            ].join('\n'),
            body: { code: '{{dep_code_input}}', name: 'Postman · Département {{dep_code}}' },
            tests: [
                status(201),
                test('Code mis en majuscules, actif, sans responsable', [
                    '    const d = pm.response.json().data;',
                    "    pm.expect(d.code).to.eql(pm.collectionVariables.get('dep_code'));",
                    '    pm.expect(d.is_active).to.eql(true);',
                    '    pm.expect(d.manager).to.eql(null);',
                    '    pm.expect(d.members).to.eql([]);',
                    "    pm.collectionVariables.set('dep_id', d.id);",
                ].join('\n')),
                test('Auteur de la création renseigné', "    pm.expect(String(pm.response.json().data.created_by.id)).to.eql(String(pm.collectionVariables.get('admin_id')));"),
                message('désignez son responsable'),
            ].join('\n'),
        }),
        request('DEP.15 Code déjà utilisé (D7)', 'POST', '/api/v1/departments', {
            body: { code: '{{dep_code}}', name: 'Postman · Doublon {{dep_code}}' },
            tests: [status(422), fieldError('code', 'déjà ce code')].join('\n'),
        }),
        request('DEP.16 Code non modifiable (D7)', 'PATCH', '/api/v1/departments/{{dep_id}}', {
            body: { code: 'PM-AUTRE' },
            tests: [status(422), fieldError('code', 'ne peut pas être modifié')].join('\n'),
        }),
        request("DEP.17 Responsable refusé : rattaché à un autre département (D4)", 'PATCH', '/api/v1/departments/{{dep_id}}', {
            body: { manager_id: '{{dept_manager_id}}' },
            tests: [status(422), fieldError('manager_id', "pas rattaché à ce département")].join('\n'),
        }),
        request('DEP.18 Responsable refusé : rôle Collaborateur (D4)', 'PATCH', '/api/v1/departments/{{dep_test_id}}', {
            body: { manager_id: '{{collab_member_id}}' },
            tests: [status(422), fieldError('manager_id', 'Responsable de Département')].join('\n'),
        }),
        request('DEP.19 Retrait du responsable', 'PATCH', '/api/v1/departments/{{dep_test_id}}', {
            body: { manager_id: null },
            tests: [status(200), test('Aucun responsable', '    pm.expect(pm.response.json().data.manager).to.eql(null);')].join('\n'),
        }),
        request('DEP.20 Désignation du responsable (D4)', 'PATCH', '/api/v1/departments/{{dep_test_id}}', {
            body: { manager_id: '{{dept_manager_id}}' },
            tests: [
                status(200),
                test('Responsable désigné', "    pm.expect(String(pm.response.json().data.manager.id)).to.eql(String(pm.collectionVariables.get('dept_manager_id')));"),
            ].join('\n'),
        }),
        request('DEP.21 Désactivation refusée : comptes actifs rattachés (D6)', 'POST', '/api/v1/departments/{{dep_test_id}}/deactivate', {
            tests: [status(422), fieldError('department', 'encore rattaché')].join('\n'),
        }),
        request("DEP.22 Désactivation d'un département sans compte actif (D6)", 'POST', '/api/v1/departments/{{dep_id}}/deactivate', {
            tests: [status(200), test('Département désactivé', '    pm.expect(pm.response.json().data.is_active).to.eql(false);')].join('\n'),
        }),
        request('DEP.23 Réactivation', 'POST', '/api/v1/departments/{{dep_id}}/activate', {
            tests: [status(200), test('Département réactivé', '    pm.expect(pm.response.json().data.is_active).to.eql(true);')].join('\n'),
        }),
        request('DEP.24 Aucune suppression possible (D6)', 'DELETE', '/api/v1/departments/{{dep_id}}', {
            tests: [status(405), errorCode('METHOD_NOT_ALLOWED')].join('\n'),
        }),
        request('DEP.25 Journal : création du département', 'GET', '/api/v1/admin/audit-logs?event=admin.department.created', {
            tests: departmentAuditEntry('admin.department.created'),
        }),
        request('DEP.26 Journal : désactivation du département', 'GET', '/api/v1/admin/audit-logs?event=admin.department.deactivated', {
            tests: departmentAuditEntry('admin.department.deactivated'),
        }),
        logout('DEP.27 Déconnexion du Super Administrateur'),
    ],
);

/* --------------------------------------------------------------- clients (lot 2.1) */

/** Entrée du journal du client suivi pour un événement, produite par cette exécution. */
const clientAuditEntry = (event, extra = '') =>
    [
        status(200),
        'const entries = pm.response.json().data || [];',
        "const expected = pm.collectionVariables.get('client_code');",
        'const entry = entries.find(e => e.details && e.details.client && e.details.client.code === expected) || {};',
        test(`Entrée « ${event} » produite par cette exécution`, [
            `    pm.expect(entry.event && entry.event.key).to.eql(${JSON.stringify(event)});`,
            "    const start = pm.collectionVariables.get('run_started_at');",
            '    if (start) { pm.expect(new Date(entry.occurred_at).getTime()).to.be.at.least(new Date(start).getTime() - 120000); }',
        ].join('\n')),
        test('Client et auteur renseignés', [
            "    pm.expect(entry.details.client.code).to.eql(pm.collectionVariables.get('client_code'));",
            "    pm.expect(String(entry.actor && entry.actor.id)).to.eql(String(pm.collectionVariables.get('admin_id')));",
            extra,
        ].filter(Boolean).join('\n')),
    ].join('\n');

const clients = folder(
    'CLIENTS (lot 2.1)',
    'Référentiel clients : champs obligatoires (C1), code généré (C2), visibilité selon le rôle (C3), '
        + 'code non modifiable et conservé (C4). Les clients créés portent le préfixe « POSTMAN », '
        + 'effacé à chaque remise à zéro des comptes de test.',
    [
        // Rend le dossier exécutable seul (option -i), sans dépendre des dossiers précédents.
        request('CLI.00 Cookie CSRF (Sanctum)', 'GET', '/sanctum/csrf-cookie', {
            pre: "if (!pm.collectionVariables.get('run_started_at')) { pm.collectionVariables.set('run_started_at', new Date().toISOString()); }",
            tests: [
                status(204),
                test('Jeton XSRF récupéré', "    pm.expect(pm.collectionVariables.get('xsrf_token')).to.be.a('string').and.not.empty;"),
            ].join('\n'),
        }),
        request('CLI.00b Fermeture d\'une session précédente', 'POST', '/api/v1/auth/logout', {
            tests: test('Aucune session ouverte après cette requête (204 ou 401)', '    pm.expect(pm.response.code).to.be.oneOf([204, 401]);'),
        }),
        request('CLI.01 Connexion du Super Administrateur', 'POST', LOGIN, {
            body: login('admin_email', 'admin_password'),
            tests: [status(200), profile('super_admin', false), "pm.collectionVariables.set('admin_id', pm.response.json().data.id);"].join('\n'),
        }),
        request('CLI.02 Département de suivi', 'GET', '/api/v1/departments', {
            tests: [
                status(200),
                test('Département de test retrouvé', [
                    "    const dep = pm.response.json().data.find(d => d.code === 'DEP-TEST');",
                    "    pm.expect(dep, 'DEP-TEST').to.be.an('object');",
                    "    pm.collectionVariables.set('dep_test_id', dep.id);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.03 Création refusée : champs invalides (C1, C2)', 'POST', '/api/v1/clients', {
            body: { name: 'AB', code: 'CLI-9999', department_ids: [] },
            tests: [
                status(422),
                fieldError('name', 'au moins 3 caractères'),
                fieldError('code', 'généré automatiquement'),
                fieldError('department_ids', 'au moins un département'),
            ].join('\n'),
        }),
        request('CLI.04 Création refusée : département inconnu (C1)', 'POST', '/api/v1/clients', {
            body: { name: 'POSTMAN INCONNU', department_ids: [999999] },
            tests: [status(422), fieldError('department_ids.0', "n'existe pas")].join('\n'),
        }),
        request('CLI.05 Département de suivi distinct', 'POST', '/api/v1/departments', {
            pre: [
                "const code = 'PM-CLI-' + Date.now().toString(36).toUpperCase().slice(-7);",
                "pm.collectionVariables.set('client_other_dep_code', code);",
            ].join('\n'),
            body: { code: '{{client_other_dep_code}}', name: 'Postman · Clients {{client_other_dep_code}}' },
            tests: [
                status(201),
                test('Département créé et identifiant conservé', [
                    "    pm.collectionVariables.set('client_other_dep_id', pm.response.json().data.id);",
                    "    pm.expect(pm.response.json().data.is_active).to.eql(true);",
                ].join('\n')),
            ].join('\n'),
        }),
        request("CLI.06 Création d'un client (C1, C2)", 'POST', '/api/v1/clients', {
            pre: [
                "const suffix = Date.now().toString(36).toUpperCase().slice(-6);",
                "pm.collectionVariables.set('client_name', 'POSTMAN CLIENT ' + suffix);",
                "pm.collectionVariables.set('client_name_input', ('postman client ' + suffix).toLowerCase());",
            ].join('\n'),
            body: {
                name: '{{client_name_input}}',
                legal_form: 'SARL',
                sector: 'Commerce de gros',
                tax_regime: 'Réel normal',
                rccm: 'CI-ABJ-2026-B-00000',
                dfe: '0000000 X 0',
                address: 'Cocody Riviera 3, Abidjan',
                phone: '+225 27 22 00 11 01',
                email: 'CONTACT@POSTMAN.TEST',
                contact_name: 'Adjoa KOUASSI',
                department_ids: ['{{dep_test_id}}'],
            },
            tests: [
                status(201),
                test('Code CLI généré, dénomination en majuscules et champs conservés', [
                    '    const c = pm.response.json().data;',
                    "    pm.expect(c.code).to.match(/^CLI-\\d{4,}$/);",
                    "    pm.expect(c.name).to.eql(pm.collectionVariables.get('client_name'));",
                    "    pm.expect(c.email).to.eql('contact@postman.test');",
                    "    pm.expect(c.legal_form).to.eql('SARL');",
                    "    pm.expect(c.sector).to.eql('Commerce de gros');",
                    "    pm.expect(c.tax_regime).to.eql('Réel normal');",
                    "    pm.expect(c.is_active).to.eql(true);",
                    "    pm.expect(c.departments).to.have.lengthOf(1);",
                    "    pm.expect(c.departments[0].code).to.eql('DEP-TEST');",
                    "    pm.expect(c.documents_count).to.eql(null);",
                    "    pm.expect(c.last_activity_at).to.eql(null);",
                    "    pm.collectionVariables.set('client_id', c.id);",
                    "    pm.collectionVariables.set('client_code', c.code);",
                ].join('\n')),
                test('Auteur de la création renseigné', "    pm.expect(String(pm.response.json().data.created_by.id)).to.eql(String(pm.collectionVariables.get('admin_id')));"),
                message('Client créé'),
            ].join('\n'),
        }),
        request("CLI.07 Création d'un client d'un autre département (C3)", 'POST', '/api/v1/clients', {
            pre: [
                "const suffix = Date.now().toString(36).toUpperCase().slice(-6);",
                "pm.collectionVariables.set('other_client_name', 'POSTMAN AUTRE DEPARTEMENT ' + suffix);",
            ].join('\n'),
            body: {
                name: '{{other_client_name}}',
                sector: 'Industrie',
                department_ids: ['{{client_other_dep_id}}'],
            },
            tests: [
                status(201),
                test('Client rattaché au département distinct', [
                    '    const c = pm.response.json().data;',
                    "    pm.expect(c.departments).to.have.lengthOf(1);",
                    "    pm.expect(String(c.departments[0].id)).to.eql(String(pm.collectionVariables.get('client_other_dep_id')));",
                    "    pm.collectionVariables.set('other_client_id', c.id);",
                    "    pm.collectionVariables.set('other_client_code', c.code);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.08 Code non modifiable (C4)', 'PATCH', '/api/v1/clients/{{client_id}}', {
            body: { code: 'CLI-9999' },
            tests: [status(422), fieldError('code', 'pas modifiable')].join('\n'),
        }),
        request('CLI.09 Modification des champs et des départements', 'PATCH', '/api/v1/clients/{{client_id}}', {
            body: {
                name: '{{client_name}} MODIFIÉ',
                sector: 'Industrie',
                department_ids: ['{{dep_test_id}}'],
            },
            tests: [
                status(200),
                test('Code inchangé, nouveaux champs appliqués', [
                    '    const c = pm.response.json().data;',
                    "    pm.expect(c.code).to.eql(pm.collectionVariables.get('client_code'));",
                    "    pm.expect(c.name).to.eql(pm.collectionVariables.get('client_name') + ' MODIFIÉ');",
                    "    pm.expect(c.sector).to.eql('Industrie');",
                    "    pm.expect(c.departments).to.have.lengthOf(1);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.10 Détail d\'un client', 'GET', '/api/v1/clients/{{client_id}}', {
            tests: [
                status(200),
                test('Fiche complète et compteurs encore nuls', [
                    '    const c = pm.response.json().data;',
                    "    pm.expect(c).to.include.all.keys('id', 'code', 'name', 'legal_form', 'sector', 'tax_regime', 'rccm', 'dfe', 'address', 'phone', 'email', 'contact_name', 'is_active', 'departments', 'created_at', 'documents_count', 'last_activity_at');",
                    "    pm.expect(c.code).to.eql(pm.collectionVariables.get('client_code'));",
                    "    pm.expect(c.documents_count).to.eql(null);",
                    "    pm.expect(c.last_activity_at).to.eql(null);",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.11 Recherche par code', 'GET', '/api/v1/clients?search={{client_code}}', {
            tests: [
                status(200),
                test('Un seul client correspond au code', [
                    '    const list = pm.response.json().data;',
                    '    pm.expect(list).to.have.lengthOf(1);',
                    "    pm.expect(list[0].code).to.eql(pm.collectionVariables.get('client_code'));",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.12 Filtre par département', 'GET', '/api/v1/clients?department={{dep_test_id}}', {
            tests: [
                status(200),
                test('Le client du département est présent, celui de l\'autre département est absent', [
                    '    const list = pm.response.json().data;',
                    "    pm.expect(list.map(c => c.code)).to.include(pm.collectionVariables.get('client_code'));",
                    "    pm.expect(list.map(c => c.code)).to.not.include(pm.collectionVariables.get('other_client_code'));",
                ].join('\n')),
                test('Départements proposés dans le filtre', [
                    '    const deps = pm.response.json().departments;',
                    "    pm.expect(deps).to.be.an('array').that.is.not.empty;",
                    "    pm.expect(deps.map(d => d.code)).to.include('DEP-TEST');",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.13 Aucune suppression possible (C4)', 'DELETE', '/api/v1/clients/{{client_id}}', {
            tests: [status(405), errorCode('METHOD_NOT_ALLOWED')].join('\n'),
        }),
        request('CLI.14 Journal : création du client', 'GET', '/api/v1/admin/audit-logs?event=admin.client.created', {
            tests: clientAuditEntry('admin.client.created', "    pm.expect(entry.details.departments).to.include('DEP-TEST');"),
        }),
        request('CLI.15 Journal : modification du client', 'GET', '/api/v1/admin/audit-logs?event=admin.client.updated', {
            tests: clientAuditEntry('admin.client.updated', "    pm.expect(entry.details.changes).to.have.property('sector');"),
        }),
        logout('CLI.16 Déconnexion du Super Administrateur'),
        request('CLI.17 Connexion du Directeur', 'POST', LOGIN, {
            body: login('director_email', 'director_password'),
            tests: [status(200), profile('directeur', false)].join('\n'),
        }),
        request('CLI.18 Le Directeur voit tout le cabinet (C3)', 'GET', '/api/v1/clients', {
            tests: [
                status(200),
                test('Les deux clients sont visibles', [
                    "    const codes = pm.response.json().data.map(c => c.code);",
                    "    pm.expect(codes).to.include(pm.collectionVariables.get('client_code'));",
                    "    pm.expect(codes).to.include(pm.collectionVariables.get('other_client_code'));",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.19 Création refusée au Directeur (C3)', 'POST', '/api/v1/clients', {
            body: { name: 'POSTMAN REFUS DIRECTEUR', department_ids: ['{{dep_test_id}}'] },
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('CLI.20 Modification refusée au Directeur (C3)', 'PATCH', '/api/v1/clients/{{client_id}}', {
            body: { name: 'POSTMAN REFUS DIRECTEUR' },
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        logout('CLI.21 Déconnexion du Directeur'),
        request('CLI.22 Connexion du collaborateur', 'POST', LOGIN, {
            body: login('lockout_email', 'lockout_password'),
            tests: [status(200), profile('collaborateur', false)].join('\n'),
        }),
        request('CLI.23 Le collaborateur ne voit que son département (C3)', 'GET', '/api/v1/clients', {
            tests: [
                status(200),
                test('Client de son département présent, client extérieur absent', [
                    "    const codes = pm.response.json().data.map(c => c.code);",
                    "    pm.expect(codes).to.include(pm.collectionVariables.get('client_code'));",
                    "    pm.expect(codes).to.not.include(pm.collectionVariables.get('other_client_code'));",
                ].join('\n')),
            ].join('\n'),
        }),
        request('CLI.24 Fiche autorisée dans son département', 'GET', '/api/v1/clients/{{client_id}}', {
            tests: [status(200), test('Code attendu', "    pm.expect(pm.response.json().data.code).to.eql(pm.collectionVariables.get('client_code'));")].join('\n'),
        }),
        request('CLI.25 Fiche refusée hors de son département (C3)', 'GET', '/api/v1/clients/{{other_client_id}}', {
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        request('CLI.26 Création refusée au collaborateur (C3)', 'POST', '/api/v1/clients', {
            body: { name: 'POSTMAN REFUS COLLABORATEUR', department_ids: ['{{dep_test_id}}'] },
            tests: [status(403), errorCode('FORBIDDEN')].join('\n'),
        }),
        logout('CLI.27 Déconnexion du collaborateur'),
    ],
);

/* ------------------------------------------------------------ collection */

const collectionPreRequest = [
    "// Authentification Sanctum par cookie : Postman conserve le cookie de session ;",
    "// ces en-têtes permettent à Laravel d'ouvrir la session et de vérifier le jeton CSRF.",
    "const origin = pm.environment.get('frontend_origin') || 'http://localhost:5173';",
    "pm.request.headers.upsert({ key: 'Accept', value: 'application/json' });",
    "pm.request.headers.upsert({ key: 'Referer', value: origin.replace(/\\/$/, '') + '/' });",
    "const xsrf = pm.collectionVariables.get('xsrf_token');",
    "if (xsrf) { pm.request.headers.upsert({ key: 'X-XSRF-TOKEN', value: xsrf }); }",
].join('\n');

const collectionTest = [
    '// Le cookie XSRF-TOKEN est renouvelé par Laravel : on garde toujours la dernière valeur, décodée.',
    'pm.response.headers.each(function (h) {',
    "    if (h.key.toLowerCase() === 'set-cookie' && h.value.indexOf('XSRF-TOKEN=') === 0) {",
    "        pm.collectionVariables.set('xsrf_token', decodeURIComponent(h.value.split(';')[0].substring('XSRF-TOKEN='.length)));",
    '    }',
    '});',
    "pm.test('Aucune trace technique exposée', function () {",
    "    pm.expect(pm.response.text()).to.not.include('\"trace\"');",
    "    pm.expect(pm.response.text()).to.not.include('\"exception\"');",
    '});',
].join('\n');

const runtimeVariables = [
    'xsrf_token', 'run_started_at', 'loop_count', 'invalid_credentials_body', 'forgot_response',
    'admin_id', 'lockout_user_id', 'created_user_id', 'created_user_email', 'temporary_password',
    'dep_test_id', 'dep_id', 'dep_code', 'dep_code_input', 'dept_manager_id', 'collab_member_id',
    'client_id', 'client_code', 'client_name', 'client_name_input',
    'other_client_id', 'other_client_code', 'other_client_name',
    'client_other_dep_id', 'client_other_dep_code',
].map((key) => ({ key, value: '', type: 'string' }));

const collection = {
    info: {
        _postman_id: '9a6f4c2e-3b1d-4f6a-9c0e-6d2b7e1a5f40',
        name: 'GED-DC-KNOWING-API',
        description: [
            'Tests de l\'API REST de GED-DC-KNOWING (Laravel). Mode d\'emploi : docs/postman/GUIDE-TESTS-API.md.',
            '',
            '**Avant chaque exécution complète** : `php artisan db:seed --class=PostmanTestAccountsSeeder` (remet les comptes de test à zéro).',
            '',
            '**Authentification** : Sanctum en mode SPA (cookie de session + jeton CSRF). Il n\'y a pas de jeton « Bearer » :',
            'la requête 00.2 récupère le cookie CSRF, les scripts de la collection ajoutent les en-têtes Referer et X-XSRF-TOKEN.',
            '',
            '**Exécution** : dans l\'ordre, avec un délai de 3 500 ms entre les requêtes (limites anti-abus de l\'API).',
            '',
            'Les numéros entre parenthèses (A1… H1) renvoient aux 35 règles d\'authentification (RG-AUTH-01 à RG-AUTH-35).',
        ].join('\n'),
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    event: [
        { listen: 'prerequest', script: { type: 'text/javascript', exec: collectionPreRequest.split('\n') } },
        { listen: 'test', script: { type: 'text/javascript', exec: collectionTest.split('\n') } },
    ],
    variable: runtimeVariables,
    item: [
        folder('AUTHENTIFICATION', 'Toutes les fonctionnalités d\'authentification réellement implémentées.', [
            preparation, withoutSession, connexion, disabled, lockout, administration, afterUnlock, firstLogin, changePassword, forgot, audit,
            manualReset,
        ]),
        departments,
        clients,
    ],
};

/* ----------------------------------------------------------- environnement */

const v = (key, value, type = 'default') => ({ key, value, type, enabled: true });

const environment = {
    id: '4d1c7b2a-8e5f-4a3b-b6d9-2f0e8c1a7b35',
    name: 'GED-DC-KNOWING-LOCAL',
    values: [
        v('base_url', 'http://localhost:8004'),
        v('frontend_origin', 'http://localhost:5173'),
        // Comptes créés par PostmanTestAccountsSeeder (environnements local et testing uniquement).
        v('admin_email', 'postman.admin@postman.test'),
        v('admin_password', 'PostmanAdmin2026', 'secret'),
        v('standard_email', 'postman.collaborateur@postman.test'),
        v('standard_password', 'PostmanCollab2026', 'secret'),
        v('director_email', 'postman.directeur@postman.test'),
        v('director_password', 'PostmanDirect2026', 'secret'),
        v('inactive_email', 'postman.desactive@postman.test'),
        v('inactive_password', 'PostmanInactif2026', 'secret'),
        v('first_login_email', 'postman.premiere@postman.test'),
        v('first_login_password', 'PostmanTemp2026a', 'secret'),
        v('lockout_email', 'postman.verrouillage@postman.test'),
        v('lockout_password', 'PostmanVerrou2026', 'secret'),
        v('reset_email', 'postman.reinit@postman.test'),
        v('dept_manager_email', 'postman.responsable@postman.test'),
        v('dept_manager_password', 'PostmanRespDep2026', 'secret'),
        v('unknown_email', 'postman.inconnu@postman.test'),
        // Nouveaux mots de passe choisis pendant les tests (conformes à la politique).
        v('new_password', 'PostmanNouveau2026', 'secret'),
        v('first_login_new_password', 'PostmanPremiere2026', 'secret'),
        v('reset_new_password', 'PostmanReinitOk2026', 'secret'),
        // À renseigner localement : jeton du lien de réinitialisation (storage/logs/laravel.log).
        v('reset_token', '', 'secret'),
        // Renseigné automatiquement par la requête 02.6.
        v('user_id', ''),
    ],
    _postman_variable_scope: 'environment',
};

writeFileSync(join(OUT, 'GED-DC-KNOWING-API.postman_collection.json'), JSON.stringify(collection, null, 4) + '\n');
writeFileSync(join(OUT, 'GED-DC-KNOWING-LOCAL.postman_environment.json'), JSON.stringify(environment, null, 4) + '\n');

const count = (items) => items.reduce((n, i) => n + (i.item ? count(i.item) : 1), 0);
console.log(`Collection générée : ${count(collection.item)} requêtes ; environnement : ${environment.values.length} variables.`);
