document.addEventListener('DOMContentLoaded', (event) => {
    const saveButton = document.getElementById('save-button');
    const addBoxButton = document.getElementById('add-box-button');
    const deleteBoxButton = document.getElementById('delete-box-button');
    const exportButton = document.getElementById('export-button');
    const copyPlanButton = document.getElementById('copy-plan-button');
    const groupButton = document.getElementById('group-button');
    const canvas = document.getElementById('canvas');
    const pane = document.getElementById('pane');
    const panePlaceholder = document.getElementById('panePlaceholder');
    const valuesPane = document.getElementById('values-pane');
    const valuesPanePlaceholder = document.getElementById('values-pane-placeholder');
    const valuesPaneContent = document.getElementById('values-pane-content');
    const hideValuesPaneButton = document.getElementById('hide-values-pane-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const suggestBoxButton = document.getElementById('add-another-cluster-button');
    const canvasContainer = document.getElementById('canvas-container');
    const tabContainer = document.getElementById('tab-container');
    const searchBar = document.getElementById('searchBar');
    const codeBlockContainer = document.getElementById('codeBlockContainer');
    const useCaseSearchBar = document.getElementById('useCaseSearchBar');
    const viewSolutionExplanationButton = document.getElementById('view-solution-explanation-button');
    const annotateChangeableAreaButton = document.getElementById('annotate-changeable-area-button');
    const solutionTextarea = document.querySelector('#solution');

    canvasContainer.style.display = 'block';
    tabContainer.style.display = 'none';

    const inEditMode = document.getElementById('canvas').getAttribute('data-mode').toLowerCase() === 'true';
    let selectedBoxes = null;
    const selectedDomain = document.getElementById('canvas').getAttribute('data-domain').toLowerCase();
    console.log(selectedDomain);

    loadDomainData(selectedDomain);

    const selectionBox = document.getElementById('selection-box');
    let isSelecting = false;
    let startX, startY;
  
    canvas.addEventListener('mousedown', (e) => {     
        if (e.shiftKey) {
            isSelecting = true;
            let rect = canvas.getBoundingClientRect();

            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
    
            selectionBox.style.left = `${startX}px`;
            selectionBox.style.top = `${startY}px`;
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            selectionBox.style.display = 'block';
    
            e.preventDefault();
        }
    });
    
    canvas.addEventListener('click', (e) => {
        const currentlySelected = document.querySelectorAll('.draggable.selected');
        if (currentlySelected.length != 0) {
            saveButton.click();
            currentlySelected.forEach((el) => {
                el.classList.remove('selected');
                selectedBoxes = null;
                pane.classList.remove('visible');
                panePlaceholder.classList.add('visible');
                valuesPane.classList.remove('visible');
                valuesPanePlaceholder.classList.remove('visible');
            });
        }
        updateGroupButtonVisibility();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        console.log('mousemove');

        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
    
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
    
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
        selectionBox.style.left = `${Math.min(startX, currentX)}px`;
        selectionBox.style.top = `${Math.min(startY, currentY)}px`;
    
        document.querySelectorAll('.draggable').forEach(el => {
            const elRect = el.getBoundingClientRect();
            const selectionRect = selectionBox.getBoundingClientRect();
    
            if (elRect.left < selectionRect.right &&
                elRect.right > selectionRect.left &&
                elRect.top < selectionRect.bottom &&
                elRect.bottom > selectionRect.top) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        updateGroupButtonVisibility();
    });
  
    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            selectionBox.style.display = 'none';
            updateGroupButtonVisibility();
        }
    });
  
    interact('.draggable')
        .draggable({
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            listeners: {
                start(event) {
                },
                move(event) {
                    const selectedElements = document.querySelectorAll('.draggable.selected');
                    const deltaX = event.dx;
                    const deltaY = event.dy;
    
                    selectedElements.forEach(el => {
                        const x = (parseFloat(el.getAttribute('data-x')) || 0) + deltaX;
                        const y = (parseFloat(el.getAttribute('data-y')) || 0) + deltaY;
    
                        el.style.transform = `translate(${x}px, ${y}px)`;
                        el.setAttribute('data-x', x);
                        el.setAttribute('data-y', y);
                    });
                }
            }
        });

    applyTransform = box => {
        const transform = box.style.transform;
        let x, y;
        try {
            x = transform ? parseFloat(transform.match(/translate\((.*)px, (.*)px\)/)[1]) : 0;
            y = transform ? parseFloat(transform.match(/translate\((.*)px, (.*)px\)/)[2]) : 0;
        } catch (error) {
            x = 0;
            y = 0;
        } finally {
            box.setAttribute('data-x', x);
            box.setAttribute('data-y', y);
        }
    };

    document.querySelectorAll('.draggable').forEach(applyTransform);

    interact('.draggable')
        .on('doubletap', function(event) {
            const target = event.currentTarget;
            target.focus();
        })
        .on('blur', function(event) {
            const target = event.currentTarget;
            target.setAttribute('contenteditable', 'false');
        });

    const setUpDraggableInteractions = box => {
        box.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentlySelected = document.querySelectorAll('.draggable.selected');
            if (currentlySelected.length != 0) {
                saveButton.click();
                currentlySelected.forEach((el) => {
                    if (el !== box) {
                        el.classList.remove('selected');
                    }
                });
            }
            box.classList.add('selected');
            selectedBoxes = [box];
            pane.classList.add('visible');
            panePlaceholder.classList.remove('visible');                
            valuesPane.classList.remove('visible');
            valuesPanePlaceholder.classList.add('visible');

            populatePane(box);
            updateGroupButtonVisibility();
        });
        box.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            box.focus();
        });

        box.addEventListener('blur', (event) => {
            box.setAttribute('contenteditable', 'false');
        });
    };

    document.querySelectorAll('.draggable').forEach(setUpDraggableInteractions);

    const populatePane = (box) => {
        document.getElementById('name').value = box.dataset.name;
        document.getElementById('goal').value = box.dataset.goal;
        document.getElementById('solution').textContent = box.dataset.solution;
        document.getElementById('changeable_areas').value = box.dataset.changeableAreas;

        let goToUseCaseButton = document.getElementById('go-to-use-case-button');
        if (!goToUseCaseButton) {
            goToUseCaseButton = document.createElement('button');
            goToUseCaseButton.id = 'go-to-use-case-button';
            goToUseCaseButton.innerText = 'Search in Programs';
            document.getElementById('pane').appendChild(goToUseCaseButton);
        }
        goToUseCaseButton.onclick = () => {
            goToUseCase(box.dataset.solution);
        };
    };

    const goToUseCase = (solution) => {
        openTab(document.getElementById('tab2-link'));
    
        setTimeout(() => {
            const codeBlocks = document.querySelectorAll('#tab2 .code-block pre');
            let targetBlock = null;
    
            codeBlocks.forEach((block) => {
                if (block.textContent.includes(solution)) {
                    targetBlock = block;
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    highlightText(block, solution, '#77dd77');
                }
            });
    
            if (!targetBlock) {
                alert('No matching code block found.');
            }
        }, 500);
    };
    
    const highlightText = (element, text, color = 'yellow') => {
        const innerHTML = element.innerHTML;
        const index = innerHTML.indexOf(text);
        if (index >= 0) {
            element.innerHTML = innerHTML.substring(0, index) +
                `<span class='highlight' style='background-color: ${color};'>` + innerHTML.substring(index, index + text.length) + "</span>" +
                innerHTML.substring(index + text.length);
        }
    };

    const updateBoxData = (box) => {
        box.dataset.name = document.getElementById('name').value;
        box.dataset.goal = document.getElementById('goal').value;
        box.dataset.solution = document.getElementById('solution').textContent;
        box.dataset.changeableAreas = document.getElementById('changeable_areas').value;
        box.innerText = box.dataset.name;
    };

    if (inEditMode) {
        document.querySelectorAll('.pane-input').forEach(input => {
            input.addEventListener('click', (event) => {
                event.stopPropagation();
                const field = event.target.id;
                if (valuesPaneContent.getAttribute('data-field') == event.target.id)
                    return;
                const boxId = selectedBoxes && selectedBoxes.length == 1 ? selectedBoxes[0].dataset.boxId : null;
                valuesPaneContent.setAttribute('data-field', field);
                valuesPaneContent.setAttribute('data-box-id', boxId);
                fetchPotentialValues(boxId, field, event.target.value);
            });
        });
    }

    function substringMatch(reference, str) {
        let matchCount = 0;
        let refIdx = 0;
    
        for (let i = 0; i < str.length; i++) {
            if (str[i] === reference[refIdx]) {
                matchCount++;
                refIdx++;
            }
            if (refIdx >= reference.length) break;
        }
        
        return matchCount;
    }
    
    function sortBySimilarity(reference, list) {
        return list.sort((a, b) => substringMatch(reference, b) - substringMatch(reference, a));
    }
    

    const fetchPotentialValues = (boxId, field, value="") => {
        showLoadingSpinner();
        fetch(`/potential_values/${boxId}/${field}`, { cache: "force-cache" })
            .then(response => response.json())
            .then(data => {
                hideLoadingSpinner();
                console.log(value, data);
                sortBySimilarity(value, data);
                console.log(data);
                populateValuesPane(field, data);
                valuesPane.classList.add('visible');
                valuesPanePlaceholder.classList.remove('visible');
                
            })
            .catch(error => {
                hideLoadingSpinner();
                console.error('Error fetching potential values:', error);
            });
    };

    function createBoxElement(box) {
        const div = document.createElement('div');
        applyTransform(div);
        div.id = `box-${box.id}`;
        div.className = `draggable ${box.cart ? 'in-cart' : ''}`;
        div.setAttribute('contenteditable', 'false');
        div.setAttribute('data-id', box.id);
        div.setAttribute('data-box-id', box.box_id);
        div.setAttribute('data-name', box.name);
        div.setAttribute('data-goal', box.goal);
        div.setAttribute('data-solution', box.solution);
        div.setAttribute('data-changeable-areas', box.changeable_areas);
        div.setAttribute('style', `transform: translate(${box.position_x}px, ${box.position_y}px);`);
        div.setAttribute('data-cart', box.cart);
        div.innerHTML = box.name;
        return div;
    }

    suggestBoxButton.addEventListener('click', () => {
        fetch('/load_more_clusters', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(response => {
                if (response.status == 400) {
                    alert('No candidates available.');
                } else {
                    return response.json();
                }
            })
            .then(data => {
                const box = createBoxElement(data);
                canvas.appendChild(box);
                setUpDraggableInteractions(box);
                applyTransform(box);
            })
            .catch((error) => {
                console.error('Error loading candidate:', error);
            });
    });

    const populateValuesPane = (field, values) => {
        valuesPaneContent.innerHTML = '';
        values.forEach(value => {
            let elem;
            if (field === 'solution') {
                elem = document.createElement('pre');
                elem.contentEditable = true;
                elem.classList.add('pane-input', 'hljs', 'language-python');
                elem.style.display = 'block';
            } else {
                elem = document.createElement('div');
            }
            elem.textContent = value;
            elem.value = value;
            elem.addEventListener('click', () => {
                const field = valuesPaneContent.getAttribute('data-field');
                document.getElementById(field).value = value;
                document.getElementById(field).textContent = value;
                if (selectedBoxes && selectedBoxes.length == 1) {
                    updateBoxData(selectedBoxes[0]);
                }
            });
            valuesPaneContent.appendChild(elem);
        });
    };

    const showLoadingSpinner = () => {
        loadingSpinner.style.display = 'block';
        valuesPaneContent.style.display = 'none';
    };

    const hideLoadingSpinner = () => {
        loadingSpinner.style.display = 'none';
        valuesPaneContent.style.display = 'block';
    };

    hideValuesPaneButton.addEventListener('click', () => {
        valuesPane.classList.remove('visible');
        valuesPanePlaceholder.classList.add('visible');
    });

    addBoxButton.addEventListener('click', () => {
        const newBoxId = 'new-' + Date.now();
        const newBox = document.createElement('div');
        newBox.id = `box-${newBoxId}`;
        newBox.className = 'draggable';
        newBox.setAttribute('data-id', newBoxId);
        newBox.setAttribute('data-box-id', newBoxId);
        newBox.setAttribute('data-name', '');
        newBox.setAttribute('data-goal', '');
        newBox.setAttribute('data-solution', '');
        newBox.setAttribute('data-changeable-areas', '');
        newBox.setAttribute('data-cart', 'false');
        newBox.style.transform = 'translate(0px, 0px)';
        newBox.innerText = 'New Box';
        canvas.appendChild(newBox);

        interact(newBox)
            .draggable({
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    start(event) {
                    },
                    move(event) {
                      const selectedElements = document.querySelectorAll('.draggable.selected');
                      const deltaX = event.dx;
                      const deltaY = event.dy;
            
                      selectedElements.forEach(el => {
                        const x = (parseFloat(el.getAttribute('data-x')) || 0) + deltaX;
                        const y = (parseFloat(el.getAttribute('data-y')) || 0) + deltaY;
            
                        el.style.transform = `translate(${x}px, ${y}px)`;
                        el.setAttribute('data-x', x);
                        el.setAttribute('data-y', y);
                      });
                    }
                  }
            })
            .on('doubletap', function(event) {
                const target = event.currentTarget;
                target.focus();
            })
            .on('blur', function(event) {
                const target = event.currencdTarget;
                target.setAttribute('contenteditable', 'false');
            });

        newBox.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentlySelected = document.querySelectorAll('.draggable.selected');
            if (currentlySelected.length != 0) {
                saveButton.click();
                currentlySelected.forEach((el) => {
                    if (el !== newBox) {
                        el.classList.remove('selected');
                    }
                });
            }

            newBox.classList.add('selected');
            selectedBoxes = [newBox];
            pane.classList.add('visible');
            panePlaceholder.classList.remove('visible');
            valuesPane.classList.remove('visible');
            valuesPanePlaceholder.classList.add('visible');
            populatePane(newBox);
            updateGroupButtonVisibility();
        });

        newBox.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            newBox.focus();
        });

        newBox.addEventListener('blur', (event) => {
            newBox.setAttribute('contenteditable', 'false');
        });

        fetch('/save_new_box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newBoxId,
                user_id: selectedBoxes && selectedBoxes.length == 1 ? selectedBoxes[0].dataset.userId : null,
                name: '',
                goal: '',
                solution: '',
                changeable_areas: '',
                position_x: 0,
                position_y: 0
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('New box saved:', data);
            })
            .catch((error) => {
                console.error('Error saving new box:', error);
            });
    });

    saveButton.addEventListener('click', () => {
        if (selectedBoxes) {
            selectedBoxes.forEach(updateBoxData);
        }

        const boxes = document.querySelectorAll('.draggable');
        const userBoxes = Array.from(boxes).map(box => ({
            id: box.getAttribute('data-id'),
            box_id: box.dataset.boxId,
            name: box.dataset.name,
            goal: box.dataset.goal,
            solution: box.dataset.solution,
            changeable_areas: box.dataset.changeableAreas,
            position_x: parseFloat(box.getAttribute('data-x')) || 0,
            position_y: parseFloat(box.getAttribute('data-y')) || 0,
            cart: box.getAttribute('data-cart').toLowerCase()
        }));

        fetch('/save_content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_boxes: userBoxes }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    });

    deleteBoxButton.addEventListener('click', () => {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (!selectedBoxes || selectedBoxes.length == 0) {
            alert('No box selected to delete');
            return;
        }

        selectedBoxes.forEach(
        (selectedBox) => {
            const boxId = selectedBox.getAttribute('data-box-id');
            console.log(boxId);
            fetch(`/delete_box/${boxId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        selectedBox.remove();
                        selectedBox = null;
                        pane.classList.remove('visible');
                        panePlaceholder.classList.add('visible');
                        valuesPane.classList.remove('visible');
                        valuesPanePlaceholder.classList.remove('visible');
                        console.log('Box deleted:', data);
                        document.querySelectorAll('.group-label').forEach((el) => {
                            console.log(el.getAttribute('data-box-id'));
                            if (el.getAttribute('data-box-id') == boxId) {
                                el.remove();
                            }
                        })
                    } else {
                        console.error('Error deleting box:', data.message);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        });
        selectedBoxes = null;
    });

    function loadDomainData(domain) {
        fetch(`/load_domain_data/${domain}`)
            .then(response => response.json())
            .then(data => {
                populateTextBlocks(data.tab1_data);
                populateCodeBlocks(data.tab2_data);
            });
    }

    function populateTextBlocks(data) {
        var container = document.getElementById('listContainer');
        container.innerHTML = '';
        data.forEach((item, index) => {
            var textBlock = document.createElement('div');
            textBlock.className = 'text-block';
            textBlock.textContent = item.text_block;
            textBlock.dataset.id = item.id;
            textBlock.onclick = function() {
                showCodePane(item.details, item.text_block);
            };
            container.appendChild(textBlock);
        });
    }

    function showCodePane(codeContent, textBlock) {
        const codePane = document.getElementById('codePane');
        codePane.style.display = 'block';
        codePane.innerHTML = '<button id="closePane" class="close-pane">✖</button>';

        const codeBlockContainer = document.createElement('div');
        codeBlockContainer.id = 'codeBlockContainer';

        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.textContent = codeContent;

        const createPlanButton = document.createElement('button');
        createPlanButton.textContent = 'Create Plan From Program';
        createPlanButton.className = 'canvas-btn';
        createPlanButton.addEventListener('click', function() {
            addAsBox(codeContent, textBlock);
        });

        const addButton = document.createElement('button');
        addButton.textContent = 'Create Plan From Selection';
        addButton.className = 'canvas-btn';
        addButton.addEventListener('click', function() {
            const selectedText = getSelectedText(codeBlock);
            const codeToUse = selectedText || codeContent;
            addAsBox(codeToUse, textBlock);
        });

        const explainButton = document.createElement('button');
        explainButton.textContent = 'View Explanation';
        explainButton.className = 'canvas-btn';
        explainButton.addEventListener('click', function() {
            const selectedText = getSelectedText(codeBlock);
            if (selectedText) {
                explainCode(selectedText);
            } else {
                alert('Please select a part of the code to explain.');
            }
        });

        const runButton = document.createElement('button');
        runButton.textContent = 'Run Code';
        runButton.className = 'canvas-btn';
        runButton.addEventListener('click', function() {
            const codeToRun = getSelectedText(codeBlock) || codeContent;
            runCode(codeToRun);
        });

        codeBlockContainer.appendChild(codeBlock);
        codeBlockContainer.appendChild(addButton);
        codeBlockContainer.appendChild(explainButton);
        codeBlockContainer.appendChild(runButton);
        codeBlockContainer.appendChild(createPlanButton);
        codePane.appendChild(codeBlockContainer);
    }

    function getSelectedText(element) {
        let text = "";
        if (window.getSelection) {
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                if (range.commonAncestorContainer.parentNode === element || element.contains(range.commonAncestorContainer)) {
                    text = selection.toString();
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            const range = document.selection.createRange();
            if (range.parentElement() === element) {
                text = range.text;
            }
        }
        return text;
    }
    

    function addAsBox(solution, name) {
        const newBoxId = 'new-' + Date.now();
        const newBox = document.createElement('div');
        newBox.id = `box-${newBoxId}`;
        newBox.className = 'draggable';
        newBox.setAttribute('data-id', newBoxId);
        newBox.setAttribute('data-box-id', newBoxId);
        newBox.setAttribute('data-name', name);
        newBox.setAttribute('data-goal', '');
        newBox.setAttribute('data-solution', solution);
        newBox.setAttribute('data-changeable-areas', '');
        newBox.setAttribute('data-cart', 'false');
        newBox.style.transform = 'translate(0px, 0px)';
        newBox.innerText = name;
        canvas.appendChild(newBox);

        interact(newBox)
            .draggable({
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    start(event) {
                    },
                    move(event) {
                        const selectedElements = document.querySelectorAll('.draggable.selected');
                        const deltaX = event.dx;
                        const deltaY = event.dy;
                
                        selectedElements.forEach(el => {
                            const x = (parseFloat(el.getAttribute('data-x')) || 0) + deltaX;
                            const y = (parseFloat(el.getAttribute('data-y')) || 0) + deltaY;
                
                            el.style.transform = `translate(${x}px, ${y}px)`;
                            el.setAttribute('data-x', x);
                            el.setAttribute('data-y', y);
                        });
                    }
                }
            })
            .on('doubletap', function(event) {
                const target = event.currentTarget;
                target.focus();
            })
            .on('blur', function(event) {
                const target = event.currentTarget;
                target.setAttribute('contenteditable', 'false');
            });

        newBox.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentlySelected = document.querySelectorAll('.draggable.selected');
            if (currentlySelected.length != 0) {
                currentlySelected.forEach((el) => {
                    if (el !== newBox) {
                        el.classList.remove('selected');
                    }
                });
            }

            newBox.classList.add('selected');
            selectedBoxes = [newBox];
            pane.classList.add('visible');
            panePlaceholder.classList.remove('visible');
            valuesPane.classList.remove('visible');
            valuesPanePlaceholder.classList.add('visible');
            populatePane(newBox);
            updateGroupButtonVisibility();
        });

        newBox.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            newBox.focus();
        });

        newBox.addEventListener('blur', (event) => {
            newBox.setAttribute('contenteditable', 'false');
        });

        fetch('/save_new_box', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newBoxId,
                user_id: selectedBoxes && selectedBoxes.length == 1 ? selectedBoxes[0].dataset.userId : null,
                name: name,
                goal: '',
                solution: solution,
                changeable_areas: '',
                position_x: 0,
                position_y: 0
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('New box saved:', data);
                openTab(document.getElementById('tab3-link'));
            })
            .catch((error) => {
                console.error('Error saving new box:', error);
            });
    }

    function explainCode(selectedText) {
        showExplanationPopup("", loading=true);

        fetch('/explain_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: selectedText })
        })
            .then(response => response.json())
            .then(data => {
                showExplanationPopup(marked.parse(data.explanation), loading=false);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while trying to explain the code.');
            });
    }

    function showExplanationPopup(explanation, loading=false) {
        if (loading == true) {
            const explanationPopup = document.createElement('div');
            const overlayPopup = document.createElement('div');            
            overlayPopup.className = 'overlay';
            explanationPopup.className = 'explanation-popup popup';
            document.body.appendChild(overlayPopup);
            document.body.appendChild(explanationPopup);
    
            explanationPopup.innerHTML = `
            <div class="explanation-content">
                <button class="close-explanation" onclick="removePopup()">✖</button>
                <img src='https://upload.wikimedia.org/wikipedia/commons/c/c7/Loading_2.gif'></img>
            </div>
            `;
            overlayPopup.addEventListener('click', (event) => {
                removePopup();
                throw Error();
            });
    
            centerPopup(explanationPopup);
            overlayPopup.classList.add('show');
            explanationPopup.classList.add('show');
            
        } else {
            const explanationPopup = document.querySelector('.explanation-popup');
            if (explanationPopup) {
                explanationPopup.innerHTML = `
                <div class="explanation-content">
                    <button class="close-explanation" onclick="removePopup()">✖</button>
                    <p>` + explanation + `</p>
                </div>
                `;
                centerPopup(explanationPopup);
            }
        }
    }
    
    function centerPopup(popup) {
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.zIndex = '1000';
    }    

    function runCode(code) {
        showExplanationPopup("", loading=true);

        fetch('/run_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        })
            .then(response => response.json())
            .then(data => {
                showExplanationPopup(marked.parse(data.output));
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while trying to run the code.');
            });
    }

    function closeCodePane() {
        document.getElementById('codePane').style.display = 'none';
    }

    const openTab = (target, redirectUrl = null) => {
        document.querySelectorAll(".tabcontent").forEach(function(tab) {
            tab.style.display = "none";
        });

        document.querySelectorAll('.tablink').forEach((el) => {
            el.classList.remove('active');
        });

        target.classList.add('active');

        if (target.id === 'tab1-link') {
            canvasContainer.style.display = 'none';
            tabContainer.style.display = 'block';
            document.getElementById(target.id.split('-')[0]).style.display = "block";
        } else if (target.id === 'tab2-link') {
            canvasContainer.style.display = 'none';
            tabContainer.style.display = 'block';
            document.getElementById(target.id.split('-')[0]).style.display = "block";
        } else if (target.id === 'tab3-link') {
            canvasContainer.style.display = 'block';
            tabContainer.style.display = 'none';
        }

        if (target.id !== 'tab2-link') {
            document.querySelectorAll('.highlight').forEach((elem) => {
                elem.classList.remove('highlight');
            });
        }
    };

    document.querySelectorAll('.tablink').forEach((button) => {
        button.addEventListener('click', (event) => {
            openTab(event.target);
        });
    });

    function populateCodeBlocks(data) {
        const container = document.getElementById('codeBlockContainer');
        container.innerHTML = '';
        data.forEach((item, index) => {
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';

            const codeContent = document.createElement('pre');
            codeContent.className = 'code-content';
            codeContent.textContent = item;

            const addButton = document.createElement('button');
            addButton.textContent = 'Create Plan From Program';
            addButton.className = 'canvas-btn';
            addButton.addEventListener('click', function() {
                const selectedText = getSelectedText(codeContent);
                const codeToUse = selectedText || item;
                addAsBox(codeToUse, `Example ${index + 1}`);
            });

            const explainButton = document.createElement('button');
            explainButton.textContent = 'View Explanation';
            explainButton.className = 'canvas-btn';
            explainButton.addEventListener('click', function() {
                const selectedText = getSelectedText(codeContent);
                if (selectedText) {
                    explainCode(selectedText);
                } else {
                    alert('Please select a part of the code to explain.');
                }
            });

            const runButton = document.createElement('button');
            runButton.textContent = 'Run Code';
            runButton.className = 'canvas-btn';
            runButton.addEventListener('click', function() {
                const codeToRun = getSelectedText(codeContent) || item;
                runCode(codeToRun);
            });

            codeBlock.appendChild(codeContent);
            codeBlock.appendChild(addButton);
            codeBlock.appendChild(explainButton);
            codeBlock.appendChild(runButton);
            container.appendChild(codeBlock);
        });
    }

    searchBar.addEventListener('input', function() {
        const searchText = searchBar.value.toLowerCase();
        const codeBlocks = document.querySelectorAll('.code-block');

        codeBlocks.forEach(block => {
            const text = block.textContent.toLowerCase();
            if (text.includes(searchText)) {
                block.style.display = 'block';
            } else {
                block.style.display = 'none';
            }
        });

        if (searchText === '') {
            codeBlocks.forEach(block => {
                block.style.display = 'block';
            });
        }
    });

    useCaseSearchBar.addEventListener('input', function() {
        const searchText = useCaseSearchBar.value.toLowerCase();
        const useCases = document.querySelectorAll('.text-block');

        useCases.forEach(useCase => {
            const text = useCase.textContent.toLowerCase();
            if (text.includes(searchText)) {
                useCase.style.display = 'block';
            } else {
                useCase.style.display = 'none';
            }
        });

        if (searchText === '') {
            useCases.forEach(useCase => {
                useCase.style.display = 'block';
            });
        }
    });

    document.getElementById('add-to-cart-button').addEventListener('click', function() {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (!selectedBoxes || selectedBoxes.length == 0) {
            alert('Please select a box first.');
            return;
        } else {
            selectedBoxes.forEach((item) => {
                selectedBoxId = item?.dataset.id;
                const box = document.getElementById(`box-${selectedBoxId}`);
                const boxDetails = {
                    id: box.dataset.id,
                    box_id: box.dataset.boxId,
                    name: box.dataset.name,
                    goal: box.dataset.goal,
                    solution: box.dataset.solution,
                    changeable_areas: box.dataset.changeableAreas
                };
        
                fetch('/add_to_cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(boxDetails)
                })
                    .then(response => response.json())
                    .then(data => {
                        box.classList.add('in-cart');
                        box.setAttribute('data-cart', 'true');
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
        
            });
        }

    });

    document.getElementById('remove-from-cart-button').addEventListener('click', function() {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (!selectedBoxes || selectedBoxes.length == 0) {
            alert('Please select a box first.');
            return;
        } else {
            selectedBoxes.forEach((item) => {
                selectedBoxId = item?.dataset.id;
                const box = document.getElementById(`box-${selectedBoxId}`);
                const boxDetails = {
                    id: box.dataset.id,
                    box_id: box.dataset.boxId,
                    name: box.dataset.name,
                    goal: box.dataset.goal,
                    solution: box.dataset.solution,
                    changeable_areas: box.dataset.changeableAreas
                };
        
                fetch('/remove_from_cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(boxDetails)
                })
                    .then(response => response.json())
                    .then(data => {
                        box.classList.remove('in-cart');
                        box.setAttribute('data-cart', 'false');
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            });
        }
    });

    document.querySelectorAll('.draggable').forEach(box => {
        box.addEventListener('mouseup', function() {
            document.querySelectorAll('.draggable').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    function getSelectedText() {
        let text = "";
        if (window.getSelection) {
            text = window.getSelection().toString();
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.backgroundColor = 'yellow';
                span.textContent = text;
                range.deleteContents();
                range.insertNode(span);
            }
        } else if (document.selection && document.selection.type != "Control") {
            text = document.selection.createRange().text;
            const range = document.selection.createRange();
            const span = document.createElement('span');
            span.style.backgroundColor = 'yellow';
            span.textContent = text;
            range.pasteHTML(span.outerHTML);
        }
        return text;
    }

    function convertToCSV(data) {
        const array = [Object.keys(data[0])].concat(data);
        return array.map(row => {
            return Object.values(row).map(value => {
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',');
        }).join('\n');
    }

    function downloadCSV(data, filename) {
        const csv = convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    exportButton.addEventListener('click', () => {
        const boxes = document.querySelectorAll('.draggable');
        const userBoxes = Array.from(boxes).map(box => ({
            name: box.dataset.name,
            goal: box.dataset.goal,
            solution: box.dataset.solution,
            changeable_areas: box.dataset.changeableAreas
        }));

        downloadCSV(userBoxes, 'plans.csv');
    });

    copyPlanButton.addEventListener('click', () => {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (selectedBoxes) {
            selectedBoxes.forEach(
            (selectedBox) => {

                const newBoxId = 'new-' + Date.now();
                const newBox = document.createElement('div');
                newBox.id = `box-${newBoxId}`;
                newBox.className = 'draggable';
                newBox.setAttribute('data-id', newBoxId);
                newBox.setAttribute('data-box-id', newBoxId);
                newBox.setAttribute('data-name', selectedBox.dataset.name);
                newBox.setAttribute('data-goal', selectedBox.dataset.goal);
                newBox.setAttribute('data-solution', selectedBox.dataset.solution);
                newBox.setAttribute('data-changeable-areas', selectedBox.dataset.changeableAreas);
                newBox.setAttribute('data-cart', 'false');
                const x = (parseFloat(selectedBox.getAttribute('data-x')) || 0) + 10;
                const y = (parseFloat(selectedBox.getAttribute('data-y')) || 0) + 10;
                newBox.style.transform = `translate(${x}px, ${y}px)`;
                newBox.setAttribute('data-x', x);
                newBox.setAttribute('data-y', y);
                newBox.innerText = selectedBox.dataset.name;
                canvas.appendChild(newBox);
            

            interact(newBox)
                .draggable({
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: 'parent',
                            endOnly: true
                        })
                    ],
                    listeners: {
                        start(event) {
                        },
                        move(event) {
                          const selectedElements = document.querySelectorAll('.draggable.selected');
                          const deltaX = event.dx;
                          const deltaY = event.dy;
                
                          selectedElements.forEach(el => {
                            const x = (parseFloat(el.getAttribute('data-x')) || 0) + deltaX;
                            const y = (parseFloat(el.getAttribute('data-y')) || 0) + deltaY;
                
                            el.style.transform = `translate(${x}px, ${y}px)`;
                            el.setAttribute('data-x', x);
                            el.setAttribute('data-y', y);
                          });
                        }
                      }
                })
                .on('doubletap', function(event) {
                    const target = event.currentTarget;
                    target.focus();
                })
                .on('blur', function(event) {
                    const target = event.currentTarget;
                    target.setAttribute('contenteditable', 'false');
                });

            setUpDraggableInteractions(newBox);

            fetch('/save_new_box', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: newBoxId,
                    user_id: selectedBox ? selectedBox.dataset.userId : null,
                    name: selectedBox.dataset.name,
                    goal: selectedBox.dataset.goal,
                    solution: selectedBox.dataset.solution,
                    changeable_areas: selectedBox.dataset.changeableAreas,
                    position_x: x,
                    position_y: y
                }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('New box saved:', data);
                })
                .catch((error) => {
                    console.error('Error saving new box:', error);
                });
            });

        } else {
            alert('Please select a box to copy.');
        }
    });

    removePopup = () => {
        const explanationPopup = document.getElementsByClassName('explanation-popup');
        const overlayPopup = document.getElementsByClassName('overlay');

        overlayPopup[0].remove();
        explanationPopup[0].remove();
    };

    const updateGroupButtonVisibility = () => {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (selectedBoxes.length > 1) {
            groupButton.style.display = 'block';
        } else {
            groupButton.style.display = 'none';
        }
    };
    updateGroupButtonVisibility();
    groupButton.addEventListener('click', () => {
        const selectedBoxes = document.querySelectorAll('.draggable.selected');
        if (selectedBoxes.length > 1) {
            const groupColor = getRandomColor();
            let minX = Infinity, minY = Infinity;
    
            selectedBoxes.forEach(box => {
                const rect = box.getBoundingClientRect();
                minX = Math.min(minX, rect.left);
                minY = Math.min(minY, rect.top);
            });
    
            selectedBoxes.forEach((box, index) => {
                box.style.backgroundColor = groupColor;
                box.setAttribute('data-group', groupColor);
            });
    
            const groupName = prompt("Enter a group name:");
            if (groupName) {
                const firstBox = selectedBoxes[0];
                const groupLabel = document.createElement('div');
                groupLabel.className = 'group-label';
                groupLabel.textContent = groupName;
                groupLabel.style.position = 'absolute';
                groupLabel.style.left = `${minX}px`;
                groupLabel.style.top = `${minY - 20}px`;
                groupLabel.style.backgroundColor = groupColor;
                groupLabel.style.color = '#000';
                groupLabel.style.padding = '2px 5px';
                groupLabel.style.borderRadius = '5px';
                groupLabel.setAttribute('data-box-id', firstBox.getAttribute('data-box-id'));
                canvas.appendChild(groupLabel);
    
                selectedBoxes.forEach((box) => {
                    interact(box)
                    .on('move', function(event) {
                        const x = parseFloat(firstBox.getAttribute('data-x')) || 0;
                        const y = parseFloat(firstBox.getAttribute('data-y')) || 0;
                        groupLabel.style.left = `${x}px`;
                        groupLabel.style.top = `${y - 20}px`;
                    });
                })
                
            }
    
            groupButton.style.display = 'none';
        }
    });
    

    const getRandomColor = () => {
        const letters = '89ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * letters.length)];
        }
        return color;
    };

    viewSolutionExplanationButton.addEventListener('click', () => {
        const solutionElement = document.getElementById('solution');
        const selectedText = getSelectedText(solutionElement);
        if (selectedText) {
            explainCode(selectedText);
        } else {
            alert('Please select a part of the solution to explain.');
        }
    });


    function checkSelection() {
        var selection = window.getSelection();
        var selectedText = selection.toString();
        
        if (selectedText) {
            if (selection.rangeCount > 0) {
                var range = selection.getRangeAt(0);
                var parentElement = range.commonAncestorContainer.parentNode;
                if (solutionTextarea.contains(parentElement) && selectedText) {
                    annotateChangeableAreaButton.classList.remove('grayed-out');
                } else {
                    annotateChangeableAreaButton.classList.add('grayed-out');
                }
            } else {
                annotateChangeableAreaButton.classList.add('grayed-out');
            }
        }
    };

    annotateChangeableAreaButton.addEventListener("click", function() {
        var selection = window.getSelection();
        var selectedText = selection.toString();
        
        if (selectedText) {
            var range = selection.getRangeAt(0);
            
            var span = document.createElement("span");
            span.style.color = "blue";
            span.style.backgroundColor = "#e0f7fa";
            span.className = "changeable-text";
            
            range.surroundContents(span);
    
            var changeableAreas = document.getElementById("changeable_areas");
            var currentText = changeableAreas.value;
            
            changeableAreas.value = currentText + '\n' + selectedText;
            
            selection.removeAllRanges();
        } else {
            alert("Please select text from the Solution area to add.");
        }
    });
    

    solutionTextarea.addEventListener("mouseup", checkSelection);

    solutionTextarea.addEventListener("keyup", checkSelection);

    document.addEventListener("click", function(event) {
        if (!solutionTextarea.contains(event.target)) {
            annotateChangeableAreaButton.classList.add('grayed-out');
        }
    });

});