import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import assert from 'assert';

const TIMEOUT = 15000;
const BASE_URL = 'http://localhost:5173';

async function findByText(driver, text) {
  return driver.wait(
    until.elementLocated(
      By.xpath(`//*[contains(translate(normalize-space(.), 'ÁÉÍÓÚABCDEFGHIJKLMNOPQRSTUVWXYZ', 'áéíóúabcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`)
    ),
    TIMEOUT
  );
}

async function runLoginModalGuiTest() {
  console.log('🚀 Iniciando prueba Selenium GUI...');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options())
    .build();

  try {
    console.log('🌐 Abriendo frontend...');
    await driver.get(BASE_URL);

    console.log('🔎 Validando formulario inicial de inicio de sesión...');

    const loginTitle = await findByText(driver, 'iniciar sesión');
    assert(await loginTitle.isDisplayed(), 'No apareció el título Iniciar sesión');

    const emailInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'correo') or contains(@placeholder, 'Correo')]")),
      TIMEOUT
    );
    assert(await emailInput.isDisplayed(), 'No apareció el campo correo');

    const passwordInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'contraseña') or contains(@placeholder, 'Contraseña')]")),
      TIMEOUT
    );
    assert(await passwordInput.isDisplayed(), 'No apareció el campo contraseña');

    const entrarButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Entrar')]")),
      TIMEOUT
    );
    assert(await entrarButton.isDisplayed(), 'No apareció el botón Entrar');

    console.log('✅ Formulario inicial validado');

    console.log('🔁 Cambiando al formulario de registro...');

    const registrateButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Regístrate')]")),
      TIMEOUT
    );

    await registrateButton.click();

    const crearCuentaTitle = await findByText(driver, 'crear cuenta');
    assert(await crearCuentaTitle.isDisplayed(), 'No apareció Crear cuenta');

    const nameInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'nombre') or contains(@placeholder, 'Nombre')]")),
      TIMEOUT
    );
    assert(await nameInput.isDisplayed(), 'No apareció el campo nombre');

    const registrarseButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Registrarse')]")),
      TIMEOUT
    );
    assert(await registrarseButton.isDisplayed(), 'No apareció el botón Registrarse');

    console.log('✅ Formulario de registro validado');

    console.log('🔁 Volviendo al formulario de inicio de sesión...');

    const iniciaSesionButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Inicia sesión')]")),
      TIMEOUT
    );

    await iniciaSesionButton.click();

    const loginTitleAgain = await findByText(driver, 'iniciar sesión');
    assert(await loginTitleAgain.isDisplayed(), 'No regresó al formulario de inicio de sesión');

    console.log('✅ Retorno al login validado');

    console.log('🎉 Selenium GUI test passed');
  } catch (error) {
    console.error('❌ Selenium GUI test failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runLoginModalGuiTest();