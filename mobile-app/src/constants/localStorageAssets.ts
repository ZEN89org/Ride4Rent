import { Image } from "react-native";

const STORAGE_MODULES: Record<string, any> = {
  "chat_images/chat_6ac8fcf2337131.81518447.jpg": require("../../assets/storage/chat_images/chat_6ac8fcf2337131.81518447.jpg"),
  "chat_images/chat_6ac903c0c11765.35650341.jpg": require("../../assets/storage/chat_images/chat_6ac903c0c11765.35650341.jpg"),
  "chat_images/chat_6ac90c0bce4a36.46188593.jpg": require("../../assets/storage/chat_images/chat_6ac90c0bce4a36.46188593.jpg"),
  "chat_images/chat_6ac90c103801e2.93945063.jpg": require("../../assets/storage/chat_images/chat_6ac90c103801e2.93945063.jpg"),
  "chat_images/chat_6ac94790d37b39.11474466.jpg": require("../../assets/storage/chat_images/chat_6ac94790d37b39.11474466.jpg"),
  "chat_images/chat_6ac947926854d6.10960142.jpg": require("../../assets/storage/chat_images/chat_6ac947926854d6.10960142.jpg"),
  "chat_images/chat_6ac94794e21d57.91777566.jpg": require("../../assets/storage/chat_images/chat_6ac94794e21d57.91777566.jpg"),
  "driver_licenses/2UrZyIs2o7lv1Bk4VV1k27CFFdovi4Z6ELPcbKV8.jpg": require("../../assets/storage/driver_licenses/2UrZyIs2o7lv1Bk4VV1k27CFFdovi4Z6ELPcbKV8.jpg"),
  "driver_licenses/49ELYmdEdIavYjpzfLQmHV8FGUMavPVEgIKH1bst.jpg": require("../../assets/storage/driver_licenses/49ELYmdEdIavYjpzfLQmHV8FGUMavPVEgIKH1bst.jpg"),
  "driver_licenses/7rJXccA56hOURqd8Htfe4wXc20EBQ2k3R0FjXmD0.jpg": require("../../assets/storage/driver_licenses/7rJXccA56hOURqd8Htfe4wXc20EBQ2k3R0FjXmD0.jpg"),
  "driver_licenses/aABXkZIeGljGUqHiNctE40jWux8nlr6ZXq6ZKNT7.jpg": require("../../assets/storage/driver_licenses/aABXkZIeGljGUqHiNctE40jWux8nlr6ZXq6ZKNT7.jpg"),
  "driver_licenses/bUfbQ7uEzzX4wC02ui1w9NKss63vKtZuWa8ztqwz.jpg": require("../../assets/storage/driver_licenses/bUfbQ7uEzzX4wC02ui1w9NKss63vKtZuWa8ztqwz.jpg"),
  "driver_licenses/dg02z0W2gdal4jR26VJSn3jktALkBnPVRu7czfGO.jpg": require("../../assets/storage/driver_licenses/dg02z0W2gdal4jR26VJSn3jktALkBnPVRu7czfGO.jpg"),
  "driver_licenses/DmgKMFwSoSlAkSixYGmRJRRUj63gsevpbCv1pCIU.jpg": require("../../assets/storage/driver_licenses/DmgKMFwSoSlAkSixYGmRJRRUj63gsevpbCv1pCIU.jpg"),
  "driver_licenses/DwPfn7uNsZJEnxjryl0rctvpLoTsiXfPbFVMnDQ5.jpg": require("../../assets/storage/driver_licenses/DwPfn7uNsZJEnxjryl0rctvpLoTsiXfPbFVMnDQ5.jpg"),
  "driver_licenses/ekCGvrw86ji1k7Cg8Ilqe73ogvwseDZA4ttQIFox.jpg": require("../../assets/storage/driver_licenses/ekCGvrw86ji1k7Cg8Ilqe73ogvwseDZA4ttQIFox.jpg"),
  "driver_licenses/FZaMQnW1YwWee1ABgxLSoSLcQN6BcZ5F3e5gmjOu.jpg": require("../../assets/storage/driver_licenses/FZaMQnW1YwWee1ABgxLSoSLcQN6BcZ5F3e5gmjOu.jpg"),
  "driver_licenses/IhL9nbTjDgSNnuC1ZDtyFvpsYS6xT0EA2sleHQMu.jpg": require("../../assets/storage/driver_licenses/IhL9nbTjDgSNnuC1ZDtyFvpsYS6xT0EA2sleHQMu.jpg"),
  "driver_licenses/IMzFHfH2GkpC7DWqaM9T0AN1KFcLCjo4vuzCsJcI.jpg": require("../../assets/storage/driver_licenses/IMzFHfH2GkpC7DWqaM9T0AN1KFcLCjo4vuzCsJcI.jpg"),
  "driver_licenses/khfKfb9RdjpupkbGbPskJQSpjbNUwzmkyA8QKOfh.jpg": require("../../assets/storage/driver_licenses/khfKfb9RdjpupkbGbPskJQSpjbNUwzmkyA8QKOfh.jpg"),
  "driver_licenses/LHfIgbf8B888mYM5GpzkI1xWuUaxUdkjwkbI9c6V.jpg": require("../../assets/storage/driver_licenses/LHfIgbf8B888mYM5GpzkI1xWuUaxUdkjwkbI9c6V.jpg"),
  "driver_licenses/OECzCcv8EJCxF5iQcK0PZoVA3Aqkzs5i1UjjKtmS.jpg": require("../../assets/storage/driver_licenses/OECzCcv8EJCxF5iQcK0PZoVA3Aqkzs5i1UjjKtmS.jpg"),
  "driver_licenses/ppmiLHTrMgwABuyKx0Md8Rw3331iOd6q5mzNDNRU.jpg": require("../../assets/storage/driver_licenses/ppmiLHTrMgwABuyKx0Md8Rw3331iOd6q5mzNDNRU.jpg"),
  "driver_licenses/pYGgjLJCbc87nWetthxyWjYs5CzmGJYtoNGncRs6.jpg": require("../../assets/storage/driver_licenses/pYGgjLJCbc87nWetthxyWjYs5CzmGJYtoNGncRs6.jpg"),
  "driver_licenses/qwOvSb2b4puiffyqaOy0YYy2T83fo4pBZuCSSDqB.jpg": require("../../assets/storage/driver_licenses/qwOvSb2b4puiffyqaOy0YYy2T83fo4pBZuCSSDqB.jpg"),
  "driver_licenses/rNsjq3K0eC9BAssW83cepsMu7wSJ8oVz6RS4kdYj.jpg": require("../../assets/storage/driver_licenses/rNsjq3K0eC9BAssW83cepsMu7wSJ8oVz6RS4kdYj.jpg"),
  "driver_licenses/RXoBkA9ll2R9Otjt0SBXCR6oeGPLLTXxtZsaIQ7o.jpg": require("../../assets/storage/driver_licenses/RXoBkA9ll2R9Otjt0SBXCR6oeGPLLTXxtZsaIQ7o.jpg"),
  "driver_licenses/TVHS4d7vEU4T6j3qogOOOYZzQRRHG5ISaQkBNLF0.jpg": require("../../assets/storage/driver_licenses/TVHS4d7vEU4T6j3qogOOOYZzQRRHG5ISaQkBNLF0.jpg"),
  "driver_licenses/vPMfgQf4IJ7Wb4QheJLcKPRuwPfU0Xb2J6mBkEOo.jpg": require("../../assets/storage/driver_licenses/vPMfgQf4IJ7Wb4QheJLcKPRuwPfU0Xb2J6mBkEOo.jpg"),
  "driver_licenses/WdkTL7B3l4lv3rtWMRIk596ENlZhYtyI7gSIO4FB.jpg": require("../../assets/storage/driver_licenses/WdkTL7B3l4lv3rtWMRIk596ENlZhYtyI7gSIO4FB.jpg"),
  "driver_licenses/xYF382xdIY2eeyxjiKEwJjCxBEeMh2tiI32Xpjip.jpg": require("../../assets/storage/driver_licenses/xYF382xdIY2eeyxjiKEwJjCxBEeMh2tiI32Xpjip.jpg"),
  "driver_licenses/z8CmF33mpRfRyfaEvExuWUtbYm4VHtERtJgm8jOb.jpg": require("../../assets/storage/driver_licenses/z8CmF33mpRfRyfaEvExuWUtbYm4VHtERtJgm8jOb.jpg"),
  "operator-documents/business-permits/aEEH99hwMFiaOGzFdKPgqPjhGMdXJs1NKyrPV62J.jpg": require("../../assets/storage/operator-documents/business-permits/aEEH99hwMFiaOGzFdKPgqPjhGMdXJs1NKyrPV62J.jpg"),
  "operator-documents/business-permits/DjfQ928o2UtnzqH2KvvYhbgbsm4MXGmnPaWWt2Vg.jpg": require("../../assets/storage/operator-documents/business-permits/DjfQ928o2UtnzqH2KvvYhbgbsm4MXGmnPaWWt2Vg.jpg"),
  "operator-documents/business-permits/EHIscV8WC5fItyrQYGRupFgYQW634cj2Ra3Tdggh.jpg": require("../../assets/storage/operator-documents/business-permits/EHIscV8WC5fItyrQYGRupFgYQW634cj2Ra3Tdggh.jpg"),
  "operator-documents/business-permits/h9zARbYtwyOslRNik3x4jJ3weLG3hMxGaC5jCCFT.jpg": require("../../assets/storage/operator-documents/business-permits/h9zARbYtwyOslRNik3x4jJ3weLG3hMxGaC5jCCFT.jpg"),
  "operator-documents/business-permits/hMFUzYPwelyx5XEM9OvxMISHonLzmiRg14R3quF5.jpg": require("../../assets/storage/operator-documents/business-permits/hMFUzYPwelyx5XEM9OvxMISHonLzmiRg14R3quF5.jpg"),
  "operator-documents/business-permits/iXW3FviwcJhpbGlMUk7aGsce51t7PBrugnB0L8Cp.jpg": require("../../assets/storage/operator-documents/business-permits/iXW3FviwcJhpbGlMUk7aGsce51t7PBrugnB0L8Cp.jpg"),
  "operator-documents/business-permits/krGfYsOvsoBUA8Mseiyxrh4Tjv4F7iLfz8TKjgBw.jpg": require("../../assets/storage/operator-documents/business-permits/krGfYsOvsoBUA8Mseiyxrh4Tjv4F7iLfz8TKjgBw.jpg"),
  "operator-documents/business-permits/o7xdlYZuIERX268i8rglpPNYsyzG6WVsrnw1xWxw.jpg": require("../../assets/storage/operator-documents/business-permits/o7xdlYZuIERX268i8rglpPNYsyzG6WVsrnw1xWxw.jpg"),
  "operator-documents/business-permits/s7IOWiB4TGZBATXVSXrhz4Dim9nsJ3uuwm93C5xT.jpg": require("../../assets/storage/operator-documents/business-permits/s7IOWiB4TGZBATXVSXrhz4Dim9nsJ3uuwm93C5xT.jpg"),
  "operator-documents/business-permits/SXo8maWBO68Ln74oIjoLCLBuiVfanwI4wshLjexQ.jpg": require("../../assets/storage/operator-documents/business-permits/SXo8maWBO68Ln74oIjoLCLBuiVfanwI4wshLjexQ.jpg"),
  "operator-documents/business-permits/vPk90P9dmvcw3NiRMnCDVXA8UnDgATt4fibS4X4E.jpg": require("../../assets/storage/operator-documents/business-permits/vPk90P9dmvcw3NiRMnCDVXA8UnDgATt4fibS4X4E.jpg"),
  "operator-documents/business-permits/VQFkodr7ZApRcRMAut8uPSbdwPu2juuv2v2kZBOM.png": require("../../assets/storage/operator-documents/business-permits/VQFkodr7ZApRcRMAut8uPSbdwPu2juuv2v2kZBOM.png"),
  "operator-documents/business-permits/ynoH2V2OZ4L5flrOy05QwuQvqDHiAtyg39Ostgcc.jpg": require("../../assets/storage/operator-documents/business-permits/ynoH2V2OZ4L5flrOy05QwuQvqDHiAtyg39Ostgcc.jpg"),
  "operator-documents/business-permits/zLft3p2K1DQwYEoLPpHA7dY7hxco4VwMlmvH9yfw.jpg": require("../../assets/storage/operator-documents/business-permits/zLft3p2K1DQwYEoLPpHA7dY7hxco4VwMlmvH9yfw.jpg"),
  "operator-documents/government-ids/0DwlcyjBKcrt0uJ27hfplogFvII8DtLP7q9NnhQo.jpg": require("../../assets/storage/operator-documents/government-ids/0DwlcyjBKcrt0uJ27hfplogFvII8DtLP7q9NnhQo.jpg"),
  "operator-documents/government-ids/40vCkpHa89vDpLi6ZqCITAljlrpCfo8j75ByUhmz.jpg": require("../../assets/storage/operator-documents/government-ids/40vCkpHa89vDpLi6ZqCITAljlrpCfo8j75ByUhmz.jpg"),
  "operator-documents/government-ids/C891I6qEnRvkz56XJotaMdnGL6vpFSILAVlwSC0R.jpg": require("../../assets/storage/operator-documents/government-ids/C891I6qEnRvkz56XJotaMdnGL6vpFSILAVlwSC0R.jpg"),
  "operator-documents/government-ids/dld5V4FIxm6IYgEx748cmfAutX6HSQFzMHiIPAZA.jpg": require("../../assets/storage/operator-documents/government-ids/dld5V4FIxm6IYgEx748cmfAutX6HSQFzMHiIPAZA.jpg"),
  "operator-documents/government-ids/eziTsd9viJDXXXPCgmOBXZUzOfN1tO4brjS0ZpGL.jpg": require("../../assets/storage/operator-documents/government-ids/eziTsd9viJDXXXPCgmOBXZUzOfN1tO4brjS0ZpGL.jpg"),
  "operator-documents/government-ids/Iiu9P2NdBNDw53fwSj7DtkBVHYjxFgSg129fAu3p.jpg": require("../../assets/storage/operator-documents/government-ids/Iiu9P2NdBNDw53fwSj7DtkBVHYjxFgSg129fAu3p.jpg"),
  "operator-documents/government-ids/Jqj9D7qgurflE4i4F5M8kWInabwx9y4xhl82c6Eq.jpg": require("../../assets/storage/operator-documents/government-ids/Jqj9D7qgurflE4i4F5M8kWInabwx9y4xhl82c6Eq.jpg"),
  "operator-documents/government-ids/n3Su9MAOSNxiDj5HGMTqs1nRhvLDGsLcax75BDPi.jpg": require("../../assets/storage/operator-documents/government-ids/n3Su9MAOSNxiDj5HGMTqs1nRhvLDGsLcax75BDPi.jpg"),
  "operator-documents/government-ids/NLLvCkKIowCmrSKXNkmnQbi7TzyAevEFfUlnRcxP.jpg": require("../../assets/storage/operator-documents/government-ids/NLLvCkKIowCmrSKXNkmnQbi7TzyAevEFfUlnRcxP.jpg"),
  "operator-documents/government-ids/t1f3y3FPLCQlXfnS6afzqYdQJ3rz4K9OtxFxFy18.jpg": require("../../assets/storage/operator-documents/government-ids/t1f3y3FPLCQlXfnS6afzqYdQJ3rz4K9OtxFxFy18.jpg"),
  "operator-documents/government-ids/xcxy1sYEqyckowb3LADrWr6rizXBLvZ187nhEF9s.jpg": require("../../assets/storage/operator-documents/government-ids/xcxy1sYEqyckowb3LADrWr6rizXBLvZ187nhEF9s.jpg"),
  "operator-documents/government-ids/yMEl0xOetHLky3tYCWF4QFL8koVmBQgwSVoePYHe.jpg": require("../../assets/storage/operator-documents/government-ids/yMEl0xOetHLky3tYCWF4QFL8koVmBQgwSVoePYHe.jpg"),
  "operator-documents/government-ids/z2pqBYLSdtxRrWobNh85sgDf25r2u5DPvOE8pQ46.jpg": require("../../assets/storage/operator-documents/government-ids/z2pqBYLSdtxRrWobNh85sgDf25r2u5DPvOE8pQ46.jpg"),
  "operator-documents/government-ids/zvc9ZnAAfusFmzxI75lwkaE0EjceFdzBXyVwLnYr.jpg": require("../../assets/storage/operator-documents/government-ids/zvc9ZnAAfusFmzxI75lwkaE0EjceFdzBXyVwLnYr.jpg"),
  "payment_qr_codes/LfsqhoQvDlcu60P4NeURvTIFZGmN8PuObhYzT9N9.jpg": require("../../assets/storage/payment_qr_codes/LfsqhoQvDlcu60P4NeURvTIFZGmN8PuObhYzT9N9.jpg"),
  "payment_qr_codes/Mxyh7CVr6MXCS7Sx2snxso32Zzl8yadbECq68t3r.jpg": require("../../assets/storage/payment_qr_codes/Mxyh7CVr6MXCS7Sx2snxso32Zzl8yadbECq68t3r.jpg"),
  "profile-photos/3KQ7Pi6ji7KL1saVz0ukIHLFpw97thXGEFula2a1.jpg": require("../../assets/storage/profile-photos/3KQ7Pi6ji7KL1saVz0ukIHLFpw97thXGEFula2a1.jpg"),
  "profile-photos/kY3celjaj3m92iKF7twmN3NPicQMjXh2GQzfRZd0.jpg": require("../../assets/storage/profile-photos/kY3celjaj3m92iKF7twmN3NPicQMjXh2GQzfRZd0.jpg"),
  "profile-photos/L3jNsurRDXnSnAEVYL5C18tAyvzG5cykDZJZ60m0.jpg": require("../../assets/storage/profile-photos/L3jNsurRDXnSnAEVYL5C18tAyvzG5cykDZJZ60m0.jpg"),
  "profile-photos/NfLa6RM3PK0mNIo7xtJafz3a4Uw9UDHqtmaWWGaf.jpg": require("../../assets/storage/profile-photos/NfLa6RM3PK0mNIo7xtJafz3a4Uw9UDHqtmaWWGaf.jpg"),
  "profile-photos/Oi3cxsH5vX6qfy40kIe3ULgPbZhBcq62KrI0rRaZ.jpg": require("../../assets/storage/profile-photos/Oi3cxsH5vX6qfy40kIe3ULgPbZhBcq62KrI0rRaZ.jpg"),
  "profile-photos/SQAHHLPnRkSvXd7GbVRB0HFAPDoIqSzuZWwzQVkl.jpg": require("../../assets/storage/profile-photos/SQAHHLPnRkSvXd7GbVRB0HFAPDoIqSzuZWwzQVkl.jpg"),
  "profile-photos/ugYgDyYOnG7bQ8wuaU7r3jSYLfYeBSwbtbIAmn5F.jpg": require("../../assets/storage/profile-photos/ugYgDyYOnG7bQ8wuaU7r3jSYLfYeBSwbtbIAmn5F.jpg"),
  "profile-photos/wt9y8rrq5szSGuC36kblcNrh0l6Xn38JqgQ5Ezlv.jpg": require("../../assets/storage/profile-photos/wt9y8rrq5szSGuC36kblcNrh0l6Xn38JqgQ5Ezlv.jpg"),
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
