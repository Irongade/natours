/* eslint-disable prettier/prettier */
const nodemailer = require("nodemailer")
const pug = require("pug")
const htmlToText = require("html-to-text")

// Email must contain user, url(to send email to) then a new method eg .toWelcome()

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(" ")[0]
        this.url = url;
        this.from = `Ayangade Adeoluwa <${process.env.EMAIL_FROM}>`;
    }

    newTransport() {
        if (process.env.NODE_ENV === "production") {
            // Sendgrid
            return 1
        }

        return nodemailer.createTransport({
            // For GMAIL
            // service: "gmail"
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
                // Activate in gmail "less secure apps" options
            },
            // debug: true,
            // logger: true
        })

    }

    async send(template, subject) {
        // 1) Render html based on pug template
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
            firstName: this.firstName,
            url: this.url,
            subject
        })

        // 2 define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html,
            text: htmlToText.fromString(html)
        }

        // 3 Create a transport and send email
        await this.newTransport().sendMail(mailOptions)
    };

    async sendWelcome() {
        await this.send("welcome", "Welcome to the Natours family!")
    }

    async sendPasswordReset() {
        await this.send("passwordReset", "Your password reset token (valid for only 10 minutes)")
    }
}

