const URL = "https://teachablemachine.withgoogle.com/models/GT1Uu0K4D/";
let model, webcam, labelContainer, maxPredictions;
let isWebcamActive = false; // Variable para rastrear si la cámara está activa
let lastImagePrediction = null; // Almacenar los resultados de la última imagen subida

// Inicializar el modelo
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Cargar el modelo solo una vez
    if (!model) {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
    }
}

// Inicializar la cámara
async function initWebcam() {
    if (!model) await loadModel(); // Asegurarse de que el modelo esté cargado

    const flip = true; // Voltear la cámara horizontalmente
    webcam = new tmImage.Webcam(200, 200, flip); // Tamaño del fotograma
    await webcam.setup();
    await webcam.play();

    // Agregar el canvas de la cámara al contenedor
    document.getElementById("webcam-container").appendChild(webcam.canvas);

    // Ocultar la imagen subida si existe
    const uploadedImage = document.getElementById('uploadedImage');
    if (uploadedImage) {
        uploadedImage.style.display = 'none';
    }

    // Limpiar resultados previos
    resetResults();

    // Mostrar el botón para detener la cámara
    document.getElementById("stop-webcam-btn").style.display = "inline-block";
    document.getElementById("webcam-btn").style.display = "none";

    // Marcar la cámara como activa
    isWebcamActive = true;

    // Iniciar el bucle de predicción
    window.requestAnimationFrame(loop);
}

// Detener la cámara
function stopWebcam() {
    if (webcam) {
        webcam.stop();
        document.getElementById("webcam-container").innerHTML = '';
        document.getElementById("stop-webcam-btn").style.display = "none";
        document.getElementById("webcam-btn").style.display = "inline-block";

        // Restablecer la visibilidad de la imagen subida si existe
        const uploadedImage = document.getElementById('uploadedImage');
        if (uploadedImage) {
            uploadedImage.style.display = 'block';
        }

        // Restaurar los resultados de la última imagen subida
        if (lastImagePrediction) {
            updateResults(lastImagePrediction);
        } else {
            resetResults(); // Si no hay imagen previa, limpiar los resultados
        }

        isWebcamActive = false; // Marcar la cámara como inactiva
    }
}

// Reiniciar resultados
function resetResults() {
    document.getElementById("confidence-value").textContent = "0%";
    document.getElementById("confidence-fill").style.width = "0%";
    document.getElementById("label-container").innerHTML = '';
}

// Bucle para actualizar la cámara y realizar predicciones
async function loop() {
    if (isWebcamActive) { // Solo actualizar si la cámara está activa
        webcam.update();
        await predict();
        window.requestAnimationFrame(loop);
    }
}

// Realizar predicciones sobre la imagen de la cámara
async function predict() {
    if (!model) return; // Asegurarse de que el modelo esté cargado

    const prediction = await model.predict(webcam.canvas);
    updateResults(prediction);
}

// Manejar la subida de imágenes
document.getElementById('imageUpload').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (file) {
        // Detener la cámara si está activa
        if (isWebcamActive) {
            stopWebcam();
        }

        // Cargar el modelo si no está cargado
        if (!model) await loadModel();

        // Leer la imagen seleccionada
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = document.getElementById('uploadedImage');
            img.src = e.target.result;
            img.style.display = 'block';

            // Redimensionar la imagen para que coincida con el tamaño del modelo
            const resizedCanvas = document.createElement('canvas');
            const ctx = resizedCanvas.getContext('2d');
            resizedCanvas.width = 200; // Ancho del modelo
            resizedCanvas.height = 200; // Alto del modelo
            const image = new Image();
            image.src = e.target.result;
            await new Promise(resolve => image.onload = resolve);
            ctx.drawImage(image, 0, 0, 200, 200);

            // Limpiar resultados previos
            resetResults();

            // Realizar la predicción
            const prediction = await model.predict(resizedCanvas);
            lastImagePrediction = prediction; // Guardar los resultados de esta imagen
            updateResults(prediction);
        };
        reader.readAsDataURL(file);
    }
});

// Actualizar los resultados y la confianza del modelo
function updateResults(predictions) {
    // Asegurarse de que el contenedor de etiquetas esté inicializado
    labelContainer = document.getElementById("label-container");
    if (!labelContainer) {
        console.error("El contenedor de etiquetas no está disponible.");
        return;
    }

    // Ordenar las predicciones de mayor a menor probabilidad
    predictions.sort((a, b) => b.probability - a.probability);

    // Calcular la confianza del modelo
    let confidence = 0;
    if (predictions.length > 1) {
        confidence = (predictions[0].probability - predictions[1].probability) * 100;
    } else {
        confidence = 100; // Si solo hay una predicción, la confianza es del 100%
    }

    document.getElementById("confidence-value").textContent = confidence.toFixed(2) + "%";
    document.getElementById("confidence-fill").style.width = confidence + "%";

    // Mostrar las predicciones
    labelContainer.innerHTML = '';
    predictions.forEach((pred, index) => {
        const card = document.createElement("div");
        card.className = "label-card";
        if (index === 0) {
            card.classList.add("highest"); // Resaltar la predicción con el mayor porcentaje
        }
        card.innerHTML = `<strong>${pred.className}:</strong> ${(pred.probability * 100).toFixed(2)}%`;
        labelContainer.appendChild(card);
    });
}