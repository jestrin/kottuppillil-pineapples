const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from project root (index.html etc.)
app.use(express.static(path.join(__dirname)));

let transporterPromise;

async function createTransporter(){
  // If SMTP env vars are provided, use them; otherwise use Ethereal for local testing
  if(process.env.SMTP_HOST && process.env.SMTP_USER){
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }

  // create test account and transporter
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

transporterPromise = createTransporter();

app.post('/send', async (req, res) => {
  try{
    const { name, who, msg } = req.body;
    if(!name || !who || !msg) return res.status(400).json({ error: 'Missing fields' });

    const transporter = await transporterPromise;
    const mail = {
      from: `Website Contact <${process.env.FROM_EMAIL || 'no-reply@example.com'}>` ,
      to: process.env.TO_EMAIL || 'info@kottuppillilpineapples.com',
      subject: `Order Inquiry from ${name}`,
      text: `Order inquiry from ${name} (${who}):\n\n${msg}`,
      html: `<p>Order inquiry from <strong>${name}</strong> (${who}):</p><p>${msg.replace(/\n/g,'<br>')}</p>`
    };

    const info = await transporter.sendMail(mail);

    // If using Ethereal or test account, get preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    res.json({ ok: true, previewUrl, messageId: info.messageId });
  }catch(err){
    console.error('Error sending mail:', err);
    res.status(500).json({ error: 'Failed to send' });
  }
});

app.listen(PORT, ()=>{
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
