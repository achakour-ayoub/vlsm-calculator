const IP_BITS = 32; // Définit le nombre de bits dans une IPv4

const showError = (message) => {
    alert(message); // Affiche un message d'erreur à l'utilisateur
};

const validateCIDR = (cidr) => {
    if (isNaN(cidr) || cidr < 1 || cidr > 31) {  // Valide la valeur du CIDR (doit être un nombre entre 1 et 31)
        showError("Le CIDR doit être un nombre entre 1 et 31.");
        return false;
    }
    return true;
};

const preventZeroInSubnetCount = (input) => {
    if (input.value === "0") {
        input.value = ""; // Empêche l'affichage du nombre 0
        showError("Vous ne pouvez pas entrer le nombre 0");
    }
};

const validateSubnetCount = (subnetCount) => { // Valide le nombre de sous-réseaux (doit être un nombre valide et supérieur à 0)
    if (isNaN(subnetCount) || subnetCount < 1) {
        showError("Veuillez entrer un nombre valide de sous-réseaux (au moins 1).");
        return false;
    }
    return true;
};

const calculateMaxHosts = (cidr) => {
    return Math.pow(2, IP_BITS - cidr) - 2; // Nombre maximum d'hôtes pour le CIDR donné
};

const collectHosts = (subnetCount, cidr) => {
    const hosts = [];
    const maxHosts = calculateMaxHosts(cidr); // Calcule le nombre max d'hôtes pour le CIDR

    for (let i = 1; i <= subnetCount; i++) {  
        const hostCount = parseInt(document.getElementById(`hosts${i}`).value);
        if (isNaN(hostCount) || hostCount < 1) {
            showError(`Veuillez entrer un nombre valide d'hôtes pour le Sous-réseau ${i}.`);
            return null;
        }
        if (hostCount > maxHosts) {
            showError(`Le nombre d'hôtes dans le Sous-réseau ${i} dépasse la capacité du CIDR /${cidr}.`);
            return null;
        }
        hosts.push(hostCount);
    }
    return hosts;
};


const ipToBinary = (ip) => { // Convertit une IP en chaîne binaire de 32 bits
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        throw new Error("Format d'adresse IP invalide.");
    }

    const parts = ip.split('.');// vérifie chaque octet s’il est bien entre 0 et 255
    for (let part of parts) {
        const num = parseInt(part);
        if (isNaN(num) || num < 0 || num > 255) {
            throw new Error("Adresse IP invalide : chaque octet doit être entre 0 et 255.");
        }
    }

    return parts.map(num => parseInt(num).toString(2).padStart(8, '0')).join('');
};

const binaryToIp = (binary) => { // Convertit une chaîne binaire de 32 bits en adresse IP
    if (binary.length !== IP_BITS) {
        throw new Error("La chaîne binaire doit faire 32 bits de long.");
    }
    return binary.match(/.{8}/g).map(bin => parseInt(bin, 2)).join('.'); // Conversion binaire => décimale
};

const calculateNetworkAddress = (ip, cidr) => {
    const binaryIp = ipToBinary(ip);
    const networkBits = binaryIp.slice(0, cidr).padEnd(IP_BITS, '0'); // Garde les bits réseau et remplit le reste avec des 0
    return binaryToIp(networkBits); // Convertit en adresse IP
};

const generateTableRow = (subnet, networkIp, newCidr, rangeEndIp, broadcastIp) => { // Génère une ligne de tableau HTML pour afficher les détails du sous-réseau
    return `
        <tr>
            <td>${subnet}</td>
            <td>${networkIp}</td>
            <td>/${newCidr}</td>
            <td>${networkIp} - ${rangeEndIp}</td>
            <td>${broadcastIp}</td>
        </tr>
    `;
};

const createInputs = () => { // Récupère le nombre de sous-réseaux, vérifie sa validité puis génère dynamiquement des champs de saisie
    const subnetCount = parseInt(document.getElementById('subnetCount').value);
    if (!validateSubnetCount(subnetCount)) return;

    const subnetsDiv = document.getElementById('subnets');
    subnetsDiv.innerHTML = '';

    for (let i = 1; i <= subnetCount; i++) {
        subnetsDiv.innerHTML += `
            <input type="number" id="hosts${i}" placeholder="Nombre d'hôtes" min="1"><br>
        `;
    }
};

const getVLSM = () => { // Calcule les sous-réseaux VLSM et affiche les résultats dans un tableau
    // Efface le temps d'exécution précédent
    document.getElementById('executionTime').textContent = '';
    
    // Démarre le chronomètre
    const startTime = performance.now();

    const ip = document.getElementById('ip').value;
    const cidr = parseInt(document.getElementById('cidr').value);
    const subnetCount = parseInt(document.getElementById('subnetCount').value);

    if (!validateCIDR(cidr) || !validateSubnetCount(subnetCount)) return;  // Valide le CIDR et le nombre de sous-réseaux

    const hosts = collectHosts(subnetCount, cidr); // Récupère les nombres d'hôtes
    if (!hosts) return;

    hosts.sort((a, b) => b - a); // Trie les sous-réseaux par ordre décroissant

    try {
        // Calcule l'adresse réseau de départ en fonction du CIDR
        const networkAddress = calculateNetworkAddress(ip, cidr);
        let currentBinary = ipToBinary(networkAddress); // Utilise l'adresse de départ

        let table = `
            <tr>
                <th>Sous-réseau</th>
                <th>Adresse Réseau</th>
                <th>Masque</th>
                <th>Plage d'adresses</th>
                <th>Adresse Broadcast</th>
            </tr>
        `;

        hosts.forEach((hostCount, index) => { // Calcule les détails pour chaque sous-réseau
            const neededBits = Math.ceil(Math.log2(hostCount + 2)); // Nombre de bits nécessaires
            const newCidr = IP_BITS - neededBits; // Nouveau CIDR
            const subnetSize = Math.pow(2, neededBits); // Taille du sous-réseau

            const networkIp = binaryToIp(currentBinary); // Convertit l'adresse réseau en IPv4
            const broadcastBinary = (parseInt(currentBinary, 2) + subnetSize - 1).toString(2).padStart(32, '0');
            const broadcastIp = binaryToIp(broadcastBinary);
            const rangeEndBinary = (parseInt(broadcastBinary, 2) - 1).toString(2).padStart(32, '0'); // Adresse de broadcast
            const rangeEndIp = binaryToIp(rangeEndBinary);

            table += generateTableRow(index + 1, networkIp, newCidr, rangeEndIp, broadcastIp); // Ajoute une ligne au tableau
            currentBinary = (parseInt(broadcastBinary, 2) + 1).toString(2).padStart(32, '0'); // Met à jour l'adresse binaire
        });

        document.getElementById('resultTable').innerHTML = table; // Affiche le tableau des résultats
        
        // Calcule et affiche le temps d'exécution
        const endTime = performance.now();
        const executionTime = (endTime - startTime).toFixed(2);
        document.getElementById('executionTime').textContent = `Calcul effectué en ${executionTime} millisecondes`;
        
    } catch (error) {
        showError(error.message); // Gère les erreurs
    }
};
