import React, {useState, useEffect} from 'react';
import './index.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh, faX } from '@fortawesome/free-solid-svg-icons'
import {motion, AnimatePresence} from 'framer-motion'

const App = () => {

    const [errorsArray, setErrorsArray] = useState([])
    const [allParams, setAllParams] = useState({})
    const [step, setStep] = useState(1)

    
    const handleVerifyJSONFile = async (e) => {
        if(e.target.files[0].name.slice(-5) === ".json"){  
            const reader = new FileReader()
            reader.onload = async (e) => {
                let text = (e.target.result)
                let jsone = JSON.parse(text)
                setAllParams(jsone)
                setStep(3)
            }
            await reader.readAsText(e.target.files[0])


        }
    }

    const handleVerifyFile = async (e) => {
        if(e.target.files[0].name.slice(-6) === ".xliff"){            

            const reader = new FileReader()
            reader.onload = async (e) => {
                let textToVerify = (e.target.result)
                let newObj = {...allParams}
                const getPosition = (string, subString, index) => {
                    return string.split(subString, index).join(subString).length;
                }

                /// add to json target and source value
                while(textToVerify.indexOf('<target>') !== -1){
                let wholeGroup = textToVerify.substring(textToVerify.indexOf('<group'), textToVerify.indexOf('</group>') + 8)   

                let id = wholeGroup.substring(getPosition(wholeGroup, `"`, 1) + 1, getPosition(wholeGroup, `"`, 2)) 

                let source = wholeGroup.substring(getPosition(wholeGroup, `<source>`, 1) + 8, getPosition(wholeGroup, `</source>`, 1))
                
                let target = wholeGroup.substring(getPosition(wholeGroup, `<target>`, 1) + 8, getPosition(wholeGroup, `</target>`, 1))
                
                for (const [key, value] of Object.entries(newObj)) {
                    value.values.forEach(i => {
                        if(i.id === id){
                            i.source = source
                            i.target = target
                        }
                    })
                    
                    if(value.id === id){
                        value.translation = target
                    }
                }
                    textToVerify = textToVerify.slice((textToVerify.indexOf('</group>') + 8))
                    
                 }

                 /// verify if target doubles
                 let errors = []
                 let ErrorsInCategories = []
                 for (const [key, value] of Object.entries(newObj)) {
                    await value.values.forEach(i => {
                        if(i.target){
                             value.values.forEach(j => {
                                console.log(i.target === j.target && i.id !== j.id)
                                if(i.target === j.target && i.id !== j.id){
                                    let existing = errors.filter(k => {
                                        if(k[0] === j.id && k[1] === i.id){
                                            return k
                                        }
                                    })
                                    if(existing.length === 0){
                                        errors.push([i.id, j.id,`w parametrze /${key}/ tłumaczenie /${i.source} (id=${i.id})/ oraz /${j.source} (id=${j.id})/ jest takie samo czyli /${i.target}/`])  
                                    }
                                }
                            })
                        }
                    })
                    if(value.translation){
                        for (const [key2, value2] of Object.entries(newObj)) {
                            if(value.translation === value2.translation && value.id !== value2.id){
                                let existing = ErrorsInCategories.filter(k => {
                                    if(k[0] === value2.id && k[1] === value.id){
                                        return k
                                    }
                                })
                                if(existing.length === 0){
                                    ErrorsInCategories.push([value.id, value2.id, `kategoria /${key} (id=${value.id}) / oraz /${key2} (id=${value2.id})/ ma takie samo tłumaczenie czyl /${value.translation}/`]) 
                                }       
                            }
                        }
                    }
                 }
                 setAllParams(newObj)
                 setErrorsArray([...errors, ...ErrorsInCategories])
                 setStep(4)
            }
            await reader.readAsText(e.target.files[0])


        }
    }


    const handleDeleteItem = (itemToDelete) => {
        let existingArray = [...errorsArray]
        existingArray = existingArray.filter(i => i[2] !== itemToDelete[2])
        setErrorsArray(existingArray)
    } 

    const handleRefresh = () => {
        window.location.reload()
    }

    const handleDownoaldTxtFile = async () => {
        let content = ""

        await errorsArray.forEach(i => {
            content = content.concat("\n", i[2])
        })
        let blob = new Blob([content], {type: 'text/plain'})
        let url = URL.createObjectURL(blob)

        let a = document.createElement('a')
        a.href = url
        a.download = "xliffFails.txt"
        a.click()

        URL.revokeObjectURL(a.href)
        setStep(5)
    }

    const handleDownloadFixedFile = async () => {
        // console.log(allParams)
        // console.log(errorsArray)
        const newObj = {}
        let newTranslation = `<?xml version="1.0" encoding="UTF-8"?>
        <!--XLIFF file generated automaticaly by IdoSell for translation from [pl] to [en], on 2023-03-20 12:47 by Jakub Re?li?ski. -->
        <xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
         <file source-language="pl" target-language="en" datatype="plaintext" original="parameters">
          <body>`

        // delete doubled categories


         for (const [key, value] of Object.entries(allParams)) {
            let isError = errorsArray.filter(i => {
                if(i[0] === value.id ||  i[1] === value.id){
                    return i
                }
            })
            if(isError.length === 0){
                newObj[key] = value 
            }
        }
        // console.log(newObj)

        for (const [key, value] of Object.entries(newObj)) {
            newTranslation += `<group id="${value.id}">
            <trans-unit id="${value.id}::name">
             <source>${key}</source>
             
            <target>${value.translation}</target></trans-unit>
           </group>`

           value.values.forEach(i => {
            let isError = errorsArray.filter(j => {
                if(j[0] === value.id ||  j[1] === i.id){
                    return i
                }
            })
            if(isError.length === 0 && i.source && i.target){
                newTranslation += `<group id="${i.id}">
                <trans-unit id="${i.id}::name">
                <source>${i.source}</source>
                
                <target>${i.target}</target></trans-unit>
            </group>`
            }
           })
        }

        newTranslation += ("", `</group>
        </body>
       </file>
      </xliff>`)


      let blob = new Blob([newTranslation], {type: 'text/plain'})
        let url = URL.createObjectURL(blob)

        let a = document.createElement('a')
        a.href = url
        a.download = "paramsCleard.xliff"
        a.click()

        URL.revokeObjectURL(a.href)
        
    }

    const handleTextCopy = () => {
        navigator.clipboard.writeText(`const getParamFile = async () => {
            const openButtons = () => {
                const buttons = document.querySelectorAll(".showChildren");
                buttons.forEach(i => {
                i.click()
                })  
            }

            const downloadParmsFile = async () => {
                let allParams = {}
                let allMenuItems =  Array.from(document.getElementById('block_group0').getElementsByClassName('menu_li_item '))
                
                await allMenuItems.forEach(i => {
                    let itemsInElement = Array.from(i.getElementsByClassName('showMenuSub'))
                    let itemsExceptZero = []
                       
                    itemsInElement.forEach((j, k) => k !== 0 && itemsExceptZero.push({name: j.innerText, id: j.id.slice(12)}))
    
                    itemsExceptZero.filter(i => {
                      return i !== null
                    })
    
                    if(itemsExceptZero.length !== 0){
                        allParams = {...allParams, [itemsInElement[0].innerText]: {id: itemsInElement[0].id.slice(12), translation: "", values: [...itemsExceptZero]}}
                    }
                })
    
                let jsone = JSON.stringify(allParams)
                let blob = new Blob([jsone], {type: 'application/json'})
                let url = URL.createObjectURL(blob)
    
                let a = document.createElement('a')
                a.href = url
                a.download = "params.json"
                a.click()
    
                URL.revokeObjectURL(a.href)
            }
    
             await openButtons()
            setTimeout(downloadParmsFile, 10500)
        
            

            
        }
        getParamFile()
        `)

        setStep(2)
    }

  return (
    <div className='wrapper'>
          <div className='left'>
            <h2 >Weryfikacja Xliff <span onClick={handleRefresh} style={{fontSize: '1.75rem', cursor: 'pointer'}}><FontAwesomeIcon icon={faRefresh} /></span></h2>
            <motion.h3 initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}}>1. <span onClick={handleTextCopy} style={{textDecoration: 'underline', cursor: 'pointer'}}>
                Skopiuj kod</span> i wklej go do consoli</motion.h3>
            {step > 1 && 
            <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} className='uploadStep'>2. &nbsp;<div className='uploadStepBtn'>
                <span>Dodaj </span>
                <input onChange={handleVerifyJSONFile} multiple={false} type="file" />
            </div> &nbsp;plik params.json</motion.div>}
            {step > 2 && 
            <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} className='uploadStep'>3. &nbsp;<div className='uploadStepBtn'>
                <span>Dodaj </span>
                <input onChange={handleVerifyFile} multiple={false} type="file" />
            </div> &nbsp;plik xliff</motion.div>}
            {step > 3 && 
            <motion.h3 initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}}>4. <span onClick={handleDownoaldTxtFile} style={{textDecoration: 'underline', cursor: 'pointer'}}>
            Pobierz</span> plik ze wszystkimi błędami</motion.h3>}
            {step > 4 && 
            <motion.h3 initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}}>4. <span onClick={handleDownloadFixedFile} style={{textDecoration: 'underline', cursor: 'pointer'}}>
            Pobierz</span> poprawiony plik</motion.h3>}

          </div>
          <div className='right'>
            <AnimatePresence>
                {errorsArray?.map(i => (
                    <motion.div key={i[2]} className='errorItem' initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -20, opacity: 0}}>
                        <p>{i[2]}</p>
                        <div onClick={() => handleDeleteItem(i)} className='deleteErrorItem'>
                            <FontAwesomeIcon icon={faX} />
                        </div>
                    </motion.div>
                    
                ))}
            </AnimatePresence>
        </div>  
    </div>
  );
}

export default App; 
