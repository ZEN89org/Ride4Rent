import { Image } from "react-native";

const STORAGE_MODULES: Record<string, any> = {
  "vehicle-images/bZzxvqcbHlKEYnMiRnIpwqvSL0yoO4sPP9TaECGJ.jpg": require("../../assets/storage/vehicle-images/bZzxvqcbHlKEYnMiRnIpwqvSL0yoO4sPP9TaECGJ.jpg"),
  "vehicle-images/cAYjNtyfBVek9Y4D3zw8CLl13fdGHZGs1eh8oeIn.jpg": require("../../assets/storage/vehicle-images/cAYjNtyfBVek9Y4D3zw8CLl13fdGHZGs1eh8oeIn.jpg"),
  "vehicles/1gmZooAc0MNindPFawLrPFwZcYgShPYgxVIPIQuq.jpg": require("../../assets/storage/vehicles/1gmZooAc0MNindPFawLrPFwZcYgShPYgxVIPIQuq.jpg"),
  "vehicles/3PdD4WfKrBE4GgAlcXp3PCWxifnf6UpfVitf9Pqs.jpg": require("../../assets/storage/vehicles/3PdD4WfKrBE4GgAlcXp3PCWxifnf6UpfVitf9Pqs.jpg"),
  "vehicles/Ey4BEpQJntODaxIR4Ux8Tczt7AWfq1bxGsZFG4Cg.jpg": require("../../assets/storage/vehicles/Ey4BEpQJntODaxIR4Ux8Tczt7AWfq1bxGsZFG4Cg.jpg"),
  "vehicles/FuBPLpPisXLMSSkvM0VjkMJz89oQAOarUdLW0nQp.jpg": require("../../assets/storage/vehicles/FuBPLpPisXLMSSkvM0VjkMJz89oQAOarUdLW0nQp.jpg"),
  "vehicles/H0F1WUtRsmj1vaO81fuWzodYsSj0TRbmktnGcvS0.jpg": require("../../assets/storage/vehicles/H0F1WUtRsmj1vaO81fuWzodYsSj0TRbmktnGcvS0.jpg"),
  "vehicles/K3GNcebMGAnz1zgpmN3IhnINhXpgGPXC8cI4CjaT.jpg": require("../../assets/storage/vehicles/K3GNcebMGAnz1zgpmN3IhnINhXpgGPXC8cI4CjaT.jpg"),
  "vehicles/lnIz5vNbAsS9nANzvjg59D0RsKHOgmhSmBSbmDPX.jpg": require("../../assets/storage/vehicles/lnIz5vNbAsS9nANzvjg59D0RsKHOgmhSmBSbmDPX.jpg"),
  "vehicles/lqx8uS2w6t83E1bMmtavZB4SN5iShsyxTcqIyuvQ.jpg": require("../../assets/storage/vehicles/lqx8uS2w6t83E1bMmtavZB4SN5iShsyxTcqIyuvQ.jpg"),
  "vehicles/mADp0W0AkDTi3nPk5v1kQhgyZxlW0Ec8WaKJv2W1.jpg": require("../../assets/storage/vehicles/mADp0W0AkDTi3nPk5v1kQhgyZxlW0Ec8WaKJv2W1.jpg"),
  "vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg": require("../../assets/storage/vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg"),
  "vehicles/NopCFVUMWIHtgwXMRfUCIUy9qRvPkS2ksOsMZpjD.jpg": require("../../assets/storage/vehicles/NopCFVUMWIHtgwXMRfUCIUy9qRvPkS2ksOsMZpjD.jpg"),
  "vehicles/pxO1FD0KC4G7WM0tvymUJfpt0POjKueHDAy4BuVO.jpg": require("../../assets/storage/vehicles/pxO1FD0KC4G7WM0tvymUJfpt0POjKueHDAy4BuVO.jpg"),
  "vehicles/qA7gejdDGz32Bndkl4019NlTLrdHYSakFyuSrA0h.jpg": require("../../assets/storage/vehicles/qA7gejdDGz32Bndkl4019NlTLrdHYSakFyuSrA0h.jpg"),
  "vehicles/SGvwUeLmDmLd5b3WlbIxXB6yAHZbGjR2vtbEvPrg.jpg": require("../../assets/storage/vehicles/SGvwUeLmDmLd5b3WlbIxXB6yAHZbGjR2vtbEvPrg.jpg"),
  "vehicles/SRCIP6HHz7Cs5JIL0VT7FSA3ihvDp2H1vRx0fpeP.jpg": require("../../assets/storage/vehicles/SRCIP6HHz7Cs5JIL0VT7FSA3ihvDp2H1vRx0fpeP.jpg"),
  "vehicles/TlfsRJ3bMhn7aVGpunGhutpjfAqdqGrso0470c8E.jpg": require("../../assets/storage/vehicles/TlfsRJ3bMhn7aVGpunGhutpjfAqdqGrso0470c8E.jpg"),
  "vehicles/U38BUvoGKjtuw0fVMXOc7LDHdFmVPwmvTLghiw9P.jpg": require("../../assets/storage/vehicles/U38BUvoGKjtuw0fVMXOc7LDHdFmVPwmvTLghiw9P.jpg"),
  "vehicles/U4TaqZpF7Lr3Lq1PvDQvErNCeIHKNBr2zpZNN3p5.jpg": require("../../assets/storage/vehicles/U4TaqZpF7Lr3Lq1PvDQvErNCeIHKNBr2zpZNN3p5.jpg"),
  "vehicles/UKkevboOgW0arxl2oCUdZJ4a2qScSzux09nYGrNZ.jpg": require("../../assets/storage/vehicles/UKkevboOgW0arxl2oCUdZJ4a2qScSzux09nYGrNZ.jpg"),
  "vehicles/Vm5nTadI3HtKYkZ04RBVbYc5AoCDQBGozeVhBPLA.jpg": require("../../assets/storage/vehicles/Vm5nTadI3HtKYkZ04RBVbYc5AoCDQBGozeVhBPLA.jpg"),
  "vehicles/Ynw2Ch5G1726bJF9Yl7E5fnDpSMxAcBEGik0gbRk.jpg": require("../../assets/storage/vehicles/Ynw2Ch5G1726bJF9Yl7E5fnDpSMxAcBEGik0gbRk.jpg"),
};

const resolvedCache: Record<string, string> = {};

/**
 * Resolves a relative storage path (e.g. "vehicles/abc.jpg") to its bundled local asset URI
 * if the file exists in the local storage bundle.
 */
export const resolveBundledStorageUri = (relativeStoragePath: string): string | null => {
  const cleanKey = relativeStoragePath
    .replace(/^\/?storage\/+/i, "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");

  // Only public fleet photos may ship inside the app.
  if (!/^(vehicles|vehicle-images)\//.test(cleanKey)) return null;

  if (resolvedCache[cleanKey]) {
    return resolvedCache[cleanKey];
  }

  const mod = STORAGE_MODULES[cleanKey];
  if (!mod) {
    return null;
  }

  try {
    const resolved = Image.resolveAssetSource(mod);
    if (resolved?.uri) {
      resolvedCache[cleanKey] = resolved.uri;
      return resolved.uri;
    }
  } catch {
    // Ignore resolution errors
  }

  return null;
};
