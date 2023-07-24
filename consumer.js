import amqp from "amqplib";
import fetch from "node-fetch";

const rabbitSettings = {
  protocol: "amqp",
  hostname: "23.22.218.241",
  port: 5672,
  username: "guest",
  password: "guest",
};

let authToken = ""; // Variable global para almacenar el token

async function connect() {
  const newUserQueue = "newUser";
  const loginQueue = "login";
  const esp32Queue = "esp32";

  try {
    const conn = await amqp.connect(rabbitSettings);
    console.log("Conexión exitosa");
    const channel = await conn.createChannel();
    console.log("Canal creado exitosamente");

    // Consumir la cola "newUser"
    channel.consume(newUserQueue, async (msn) => {
      const data = msn.content.toString();
      console.log("Recibido de newUserQueue: ", data);
      const user = JSON.parse(data);
      await saveUser(user);
      channel.ack(msn);
    });

    // Consumir la cola "login"
    channel.consume(loginQueue, async (msn) => {
      const data = msn.content.toString();
      console.log("Recibido de loginQueue: ", data);
      const loginData = JSON.parse(data);
      await loginUser(loginData);
      channel.ack(msn);
    });

    // Consumir la cola "esp32"
    channel.consume(esp32Queue, async (msn) => {
      const data = msn.content.toString();
      console.log("Recibido de esp32Queue: ", data);
      const sensorData = JSON.parse(data);
      await registerSensorData(sensorData);

      const co_ppm = parseInt(data);
      if (co_ppm > 65 && co_ppm <= 85) {
        await sendEmail(
          "WARNING",
          "Los niveles de CO en el ambiente son peligrosos para la salud, no permanezca en ese lugar por mucho tiempo"
        );
      } else if (co_ppm > 85) {
        await sendEmail(
          "!DANGER!",
          "Los niveles de CO en el ambiente son dañinos para la salud, aléjese de inmediato de ese lugar"
        );
      }

      channel.ack(msn);
    });
  } catch (error) {
    console.error("Error => ", error);
  }
}

async function saveUser(user) {
  // Envío del objeto user a la API para guardar usuarios
  try {
    const response = await fetch("http://35.174.244.208:3000/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    if (response.ok) {
      console.log("Usuario guardado correctamente");
    } else {
      console.error("Error al guardar usuario");
    }
  } catch (error) {
    console.error("Error en el fetch: ", error);
  }
}

async function loginUser(loginData) {
  // Envío del objeto loginData a la API para realizar el inicio de sesión
  try {
    const response = await fetch("http://35.174.244.208:3000/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });
    if (response.ok) {
      console.log("Inicio de sesión exitoso");
      const dataAuth = await response.json();
      authToken = dataAuth.data.token; // Obtener el token y guardarlo en la variable global
      console.log(dataAuth.data.token)
    } else {
      console.error("Error en el inicio de sesión");
    }
  } catch (error) {
    console.error("Error en el fetch: ", error);
  }
}

async function registerSensorData(sensorData) {
  let dataCO = {
    co_ppm: sensorData
  }
  // Envío del objeto sensorData a la API para registrar datos
  try {
    const response = await fetch("http://35.174.244.208:3000/sensor/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataCO),
    });
    if (response.ok) {
      console.log("Datos del sensor registrados correctamente");
    } else {
      console.error("Error al registrar datos del sensor");
    }
  } catch (error) {
    console.error("Error en el fetch: ", error);
  }
}

async function sendEmail(subject, content) {
  console.error("ENTRO A SENEMAIL");
  // Verificar si se ha obtenido el token antes de enviar el correo electrónico
  if (authToken === "") {
    console.error("No se ha obtenido el token, no se puede enviar el email");
    return;
  }
  // Envío del email a la API con el token en el encabezado "Authorization"
  try {
    const response = await fetch("http://35.174.244.208:3000/users/sendemail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`, // Incluir el token en el encabezado "Authorization"
      },
      body: JSON.stringify({
        subject: subject,
        content: content,
      }),
    });
    if (response.ok) {
      console.log("Email enviado correctamente");
    } else {
      console.error("Error al enviar el email");
    }
  } catch (error) {
    console.error("Error en el fetch: ", error);
  }
}

connect();
