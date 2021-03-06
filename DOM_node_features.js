function realLeafToAlmostLeaf(node) {
    // returns ancestors node such that it and all its descendants have only 1 child
    function is_almost_leaf(node) {
        if (! node.hasChildNodes() || node.children.length === 0) {
            return true;
        } else {
            return false;
        }
    }

    while (is_almost_leaf(node.parentNode)) {
        node = node.parentNode;
    }

    return node;
}

function isLeafBeforeAnother(l1, l2) {
    // work properly only if l1 and l2 are leafs
    var tmp = l1.compareDocumentPosition(l2);
    if (tmp === 4) {
        return true;
    } else if (tmp === 2) {
        return false;
    } else {
        throw "one leafs is not before or after one another. That's really strange (if they are really leafs)";
    }
}

function isNodeInsideAnother(n1, n2) {
    const tmp = n1.compareDocumentPosition(n2);
    return (tmp & 8) > 0 || (tmp & 16) > 0;
}

function isLeafNodeInRange(firstLeafInRange, lastLeafInRange, node) {
    if (firstLeafInRange === node || isNodeInsideAnother(node, firstLeafInRange) ||
        lastLeafInRange === node  || isNodeInsideAnother(node, lastLeafInRange)) {
        return true;
    } 

    return isLeafBeforeAnother(firstLeafInRange, node) && isLeafBeforeAnother(node, lastLeafInRange);
}

function ancestors_n(doc, node, ancestors_number) {
    var result = [];
    while (node != doc.documentElement && ancestors_number > 0) {
        result.push(node.parentNode);
        node = node.parentNode;
        ancestors_number = ancestors_number - 1;
    }

    return result;
}

function ancestors_all(doc, node) {
    var result = [];
    while (node != doc.documentElement) {
        result.push(node.parentNode);
        node = node.parentNode;
    }

    return result;
}

function getNodeLeafsFromIter(iterator, make_iterator = makeForwardIterator, maxLeafs = Infinity) {
    var result = [];
    var cur_res = iterator.next();
    while (cur_res.done === false && result.length < maxLeafs) {
        result = result.concat(getNodeLeafs(cur_res.value, make_iterator, maxLeafs - result.length));
        cur_res = iterator.next();
    }

    return result;
}

function getNodeLeafs(node, make_iterator = makeForwardIterator, maxLeafs = Infinity) {
    if (!node.hasChildNodes()) {
        return [node];
    }

    if (make_iterator !== makeForwardIterator && make_iterator !== makeBackwardIterator) {
        console.log("nodeName = ", node.nodeName);
    }

    return getNodeLeafsFromIter(make_iterator(node.childNodes), make_iterator, maxLeafs);
}


function get_n_neibhor_leafs(make_iterator, doc, node, maxLeafs) {
    var ascending_list = [];
    while (node != doc.documentElement) {
        var siblings = node.parentNode.childNodes;
        var indexOfNode = Array.prototype.indexOf.call(siblings, node);
        ascending_list.push(make_iterator(siblings, indexOfNode));
        node = node.parentNode;
    }

    var result = [];
    for (var i = 0; i < ascending_list.length && result.length < maxLeafs; i++) {
        result = result.concat(getNodeLeafsFromIter(ascending_list[i], make_iterator, maxLeafs - result.length));
    }

    return result;
}

var previous_n = get_n_neibhor_leafs.bind(null, makeBackwardIterator);
var next_n = get_n_neibhor_leafs.bind(null, makeForwardIterator);

function makeForwardIterator(array, zero_index = -1) {
    var cur_index = zero_index + 1;
    
    return {
        next: function() {
            if (cur_index < array.length) {
                return {
                    value: array[cur_index++],
                    done: false
                };
            } else {
                return { done: true };
            }
        }
    }    
}

function makeBackwardIterator(array, zero_index = -1) {
    var cur_index;

    if (zero_index === -1) {
        cur_index = array.length - 1;
    } else {
        cur_index = zero_index - 1;   
    }
    
    return {
        next: function() {
            if (cur_index >= 0) {
                return {
                    value: array[cur_index--],
                    done: false
                };
            } else {
                return { done: true };
            }
        }
    }    
}

function getSelectedForest(win) {
    var selection = win.getSelection();
    if (selection.anchorNode === null) {
        return [];
    }
 

    var first = selection.anchorNode;
    var last = selection.focusNode;

    // first and last node of selection is always leafs
    if (isLeafBeforeAnother(last, first)) {
        var tmp;
        tmp = first;
        first = last;
        last = tmp;
    }

    const wholeHTML = getNodeLeafs(win.document.documentElement);
    const selectedLeafs = wholeHTML.filter(isLeafNodeInRange.bind(null, first, last));
    return leafsToForest(win.document, selectedLeafs);
}

function leafsToForest(doc, leafsList) {
    if (leafsList === []) {
        return [];
    }

    var isOneOfGivenLeafs = isLeafNodeInRange.bind(null, leafsList[0], leafsList[leafsList.length - 1]);

    var leftestUnprocessedNode = leafsList[0];
    var result = [];
    while (isOneOfGivenLeafs(leftestUnprocessedNode)) {
        var cur_node = leftestUnprocessedNode;

        const treeRoot = doc.documentElement;
        var rightestChild = function (node) {
            // assuming that node is legitimate node
            // therefore there is at least 1 child (or itself is leaf) 
            return getNodeLeafs(node, makeBackwardIterator, 1)[0];
        }

        var leftestChild = function (node) {
            // assuming that node is legitimate node
            // therefore there is at least 1 child (or itself is leaf)
            return getNodeLeafs(node, makeForwardIterator, 1)[0];
        }

        while (cur_node != treeRoot && 
               isOneOfGivenLeafs(rightestChild(cur_node.parentNode)) &&
               isOneOfGivenLeafs(leftestChild(cur_node.parentNode))) {
            cur_node = cur_node.parentNode;
        }

        result.push(cur_node);

        var nextNodeLst = next_n(doc, cur_node, 1);
        if (nextNodeLst.length === 0) {
            break;
        }

        leftestUnprocessedNode = nextNodeLst[0];
    }

    return result;
}

function levenshteinDistanceOfSequence(pattern, sequence) {
    var result = []
    var prevDistanceColumn = new Array(pattern.length + 1);
    var curDistanceColumn = new Array(pattern.length + 1);

    for (var i = 0; i < prevDistanceColumn.length; i++) {
        prevDistanceColumn[i] = i;
    }

    for (var i = 0; i < sequence.length; i++) {
        curDistanceColumn[0] = 0;
        for (var j = 1; j < curDistanceColumn.length; j++) {
            var costOfChange = prevDistanceColumn[j - 1];
            if (pattern[j - 1] != sequence[i]) {
                costOfChange++;
            }

            curDistanceColumn[j] = Math.min(costOfChange, Math.min(prevDistanceColumn[j] + 1, curDistanceColumn[j - 1] + 1));
        }
        prevDistanceColumn = curDistanceColumn.slice();
        result.push(curDistanceColumn[curDistanceColumn.length - 1]);
    }

    return result;
}

function* makeGeneratorOfPossibleMatches(doc, nodesList) {
    function nodesToNodeTypes(array) {
        return array.map(function (node) {
            return node.nodeName;
        });
    }

    const pattern = nodesToNodeTypes(nodesList.map(realLeafToAlmostLeaf));

    const wholeHTML = getNodeLeafs(doc.documentElement).map(realLeafToAlmostLeaf);
    const wholeHTMLTitles = nodesToNodeTypes(wholeHTML); 
    var numberedSeq = levenshteinDistanceOfSequence(pattern, wholeHTMLTitles).map(function(item, index) {
        return {
            value: item, 
            index: index
        };
    });
    
    numberedSeq.sort(function(a, b) {
        if (a.value < b.value) {
            return -1;
        } else if (a.value == b.value) {
            return 0;
        } else {
            return 1;
        }
    });

    for (var i = 0; i < numberedSeq.length; i++) {
        const ind = numberedSeq[i].index;
        var stop = yield { 
            leafs: wholeHTML.slice(Math.max(0, ind - pattern.length + 1), ind + 1), 
            distance: numberedSeq[i].value 
        };

        if (stop) {
            break;
        }
    }
}

function* filterGenerator(generator, f) {
    var carryOn = true;
    var parameter = undefined;
    while (carryOn) {
        var tmp;

        if (parameter === undefined) {
            tmp = generator.next();
        } else {
            tmp = generator.next(parameter);
        }

        carryOn = !tmp.done;
        if (tmp.value && f(tmp.value)) {
            parameter = yield tmp.value;
        }
    }
}

function getFunctionIsNotInsideNode() {
    var alreadyPickedLeafs = [];

    function doesNotIntersect(obj) {
        const leafList = obj.leafs;
        if (leafList === []) {
            return false;
        }

        for (var i = 0; i < alreadyPickedLeafs.length; ++i) {
            const firstLeaf = alreadyPickedLeafs[i][0];
            const lastLeaf = alreadyPickedLeafs[i][alreadyPickedLeafs[i].length - 1];
            if (isLeafNodeInRange(firstLeaf, lastLeaf, leafList[0]) ||
                isLeafNodeInRange(firstLeaf, lastLeaf, leafList[leafList.length - 1])) {

                return false;
            }
        }

        alreadyPickedLeafs.push(leafList);
        return true;
    }

    return doesNotIntersect;
}

function deleteIntersectingItems(listOfListOfLeafs) {
    var lastIncludedLeaf = null;
    function isNotInsideNode(obj) {
        const leafList = obj.leafs;
        if (leafList === []) {
            return false;
        }

        if (lastIncludedLeaf === null || 
            !isLeafNodeInRange(leafList[0], leafList[leafList.length - 1], lastIncludedLeaf)) {
         
            lastIncludedLeaf = leafList[leafList.length - 1];
            return true;
        } else {
            return false;
        }
    }

    return listOfListOfLeafs.filter(isNotInsideNode);
}

function stopCriterion_never(processed_values) {
    return false;
}

function generatorToArray(generator, maxLength = Infinity, stopCriterion = stopCriterion_never) {
    var result = [];
    var cur_value = generator.next();
    while (!cur_value.hasOwnProperty("done") || cur_value.done != true) {
        result.push(cur_value.value);
        if (result.length == maxLength || stopCriterion(result)) {
            cur_value = generator.next(true); 
        } else {
            cur_value = generator.next();
        }
    }

    if (cur_value.hasOwnProperty('value') && cur_value.value !== undefined) {
        result.push(cur_value.value);
    }

    return result;
}

module.exports.getAllAncestorsOfNode = ancestors_all;
module.exports.getNAncestorsOfNode = ancestors_n;
module.exports.getPreviousNNodes = previous_n;
module.exports.getNextNNodes = next_n;
module.exports.getSelectedForest = getSelectedForest
