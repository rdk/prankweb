import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from "react-dom";
/* eslint react/prop-types: 0 */

import { str2Hex } from "../../utilities";

import { mappingColorSheme, structureHighlightType } from "../../constants";
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/index';
import { Asset } from "molstar/lib/mol-util/assets";
import "molstar/lib/mol-model/structure/structure"
import { StructureSelection } from "molstar/lib/mol-model/structure/query/selection"
import { StructureElement } from "molstar/lib/mol-model/structure/structure/element"
import { StructureProperties } from "molstar/lib/mol-model/structure/structure/properties"
import { Unit } from "molstar/lib/mol-model/structure/structure/unit"
import { Script } from "molstar/lib/mol-script/script"
import { Segmentation } from "molstar/lib/mol-data/int/segmentation";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { Bundle } from "molstar/lib/mol-model/structure/structure/element/bundle";
import { Color } from "molstar/lib/mol-util/color";
import { ColorNames } from "molstar/lib/mol-util/color/names";
import {MolScriptBuilder as MS} from "molstar/lib/mol-script/language/builder";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { StateTree } from "molstar/lib/mol-state/tree/immutable"

import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import './MolStarWrapper.css';
import { StructureSelectionQuery } from "molstar/lib/mol-plugin-state/helpers/structure-selection-query";
import { STRUCTURE_FORMAT, SOURCE } from "../../sequence_structure";


/**
 * Converst position-color dictionary to color-positions dictionary as each color
 * will corespond to a single object. 
 */
export class ResidueColoring {
  constructor(posColorDict) {
    this.colorPos = {};
    for (const pos in posColorDict) {
      const iPos = parseInt(pos);      
      const colorHex = str2Hex(posColorDict[iPos]);
      if (!(colorHex in this.colorPos)) {
        this.colorPos[colorHex] = [];
      }
      this.colorPos[colorHex].push(iPos);
    }
  }
}

export const MolStarWrapper = (props) => {

  const wrapper = useRef(null);

  var assemblyId = '1';

  let [plugin, setPlugin] = useState(null);
  let [refs, setRefs] = useState({ } );

  useEffect(() => {

    async function init() {
      let _plugin = await createPluginUI(wrapper.current, {
        ...DefaultPluginUISpec(),
        layout: {
          initial: {
            isExpanded: false,
            showControls: false,
            controlsDisplay: "reactive"
          }
        },
        components: {
          remoteState: 'none'
        }
      });
      setPlugin(_plugin);
      window.plugin = _plugin;
      window.StateTree = StateTree;

      if (_plugin.canvas3d){
        _plugin.canvas3d.interaction.hover.subscribe((e) => {
          if (e.current && e.current.loci.kind === 'element-loci') {
            let structureElement = StructureElement.Stats.ofLoci(e.current.loci)            ;
            let location = structureElement.firstResidueLoc;
            if (location.unit) {
              const label_seq_id = StructureProperties.residue.label_seq_id(location);
              // const auth_seq_id = StructureProperties.residue.auth_seq_id(location);
              props.onHover(label_seq_id);
            }
          } else {
            props.onHover(null);
          }
        });
      }
    }
    init();

    return () => { if (plugin) plugin.dispose(); };

  }, []);

  const updateStructure = async () => {
    if (plugin){
      await plugin.clear()
      await setRefs({});
    }

    let format = props.format;
    let data;
    if (props.url) {
     data = await plugin.builders.data.download({
        url: Asset.Url(props.url),
        isBinary: false
      }, { state: { isGhost: true } });     
    } else if (props.fileHandle) {
      const fileData = await plugin.builders.data.readFile({
        file: Asset.File(props.fileHandle),
        isBinary: false
      }, { state: { isGhost: true } });
      data = fileData.data;
      
      if (data.data.indexOf("_atom_site.label_atom_id") < 0) {
        format = STRUCTURE_FORMAT.PDB
      } else {
        format = STRUCTURE_FORMAT.MMCIF
      }
    } else {
      return;
    }

    const trajectory = await plugin.builders.structure.parseTrajectory(data, format == STRUCTURE_FORMAT.PDB ? 'pdb' : 'mmcif');
    if (!trajectory) {
      props.processError('Unable to open the required structure file.');
      return;
    } 
    const model = await plugin.builders.structure.createModel(trajectory);    
    const structure = await plugin.builders.structure.createStructure(model, assemblyId ? { name: 'assembly', params: { id: assemblyId } } : { name: 'model', params: {} });    
    const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, 'polymer');
    const ligand = await plugin.builders.structure.tryCreateComponentStatic(structure, 'ligand');
    const ion = await plugin.builders.structure.tryCreateComponentStatic(structure, 'ion');
    const lipid = await plugin.builders.structure.tryCreateComponentStatic(structure, 'lipid');
    const carbohydrate = await plugin.builders.structure.tryCreateComponentStatic(structure, 'branched');

    setRefs(refs => ({...refs, ...{model: model, structure:structure, polymer:polymer}}))

    if (polymer) {
      const repr = await plugin.builders.structure.representation.addRepresentation(polymer, {
        type: 'cartoon',
        color: 'uniform', colorParams: { value: Color(0xBEBEBE) }
      });
      setRefs(refs => ({...refs, ...{cartoonRepr: repr}}))
    }

    for (const component of [ligand, lipid, carbohydrate]) {
      if (component) {
        await plugin.builders.structure.representation.addRepresentation(component, {type: 'ball-and-stick' });
      }
    }

    if (ion) {
      await plugin.builders.structure.representation.addRepresentation(ion, {
        type: 'spacefill'
      });
    }

    if (props.fileHandle) {
      const residues = [];
      const selectionChain = Script.getStructureSelection(Q =>
        Q.struct.generator.atomGroups({
          'chain-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_asym_id(), props.chain]),//TODO: getChainTest
          'atom-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.isHet(), false]),
          // 'residue-test': Q.core.rel.inRange([Q.struct.atomProperty.macromolecular.label_seq_id(), 10, 20]),
          'group-by': Q.struct.atomProperty.macromolecular.residueKey()
        }), plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);

      eachAtomicHierarchyElement(StructureSelection.unionStructure(selectionChain), {
        residue: r => residues.push({
          aa: StructureProperties.atom.label_comp_id(r),          
          seqId: StructureProperties.residue.auth_seq_id(r),
          labelSeqId: StructureProperties.residue.label_seq_id(r)
        })
      });

      //get chains 
      let chains = [];
      const selectionChains = Script.getStructureSelection(Q =>
        Q.struct.generator.atomGroups({          
          'atom-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.isHet(), false]),
          // 'residue-test': Q.core.rel.inRange([Q.struct.atomProperty.macromolecular.label_seq_id(), 10, 20]),
          'group-by': Q.struct.atomProperty.macromolecular.label_asym_id() //this grouping does not work for some reason
        }), plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);
      eachAtomicHierarchyElement(StructureSelection.unionStructure(selectionChains), {
        residue: r => chains.push(StructureProperties.chain.label_asym_id(r))
      });
      
      chains = [...new Set(chains)];

      props.onChainSelected(residues, chains, format);
    }

    if (props.structureSource == SOURCE.AF) {
      const confidences = [];
      const selectionChain = Script.getStructureSelection(Q =>
        Q.struct.generator.atomGroups({
          'chain-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_asym_id(), props.chain]),//TODO: getChainTest
          'atom-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.isHet(), false]),
          // 'residue-test': Q.core.rel.inRange([Q.struct.atomProperty.macromolecular.label_seq_id(), 10, 20]),
          'group-by': Q.struct.atomProperty.macromolecular.residueKey()
        }), plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);

      eachAtomicHierarchyElement(StructureSelection.unionStructure(selectionChain), {
        firstAtom: a => confidences.push(StructureProperties.atom.B_iso_or_equiv(a))
      });

      props.onConfidenceSet(confidences);
    }
  }

  useEffect(() => {
    if (!plugin) return ;
    updateStructure();
  }, [plugin, props.url, props.fileHandle, props.chain])

  useEffect(() => {

    if (plugin === null || plugin.managers.structure.hierarchy.current.structures.length === 0) return;

    if (props.posToHighlight === null) {
      plugin.managers.interactivity.lociHighlights.clearHighlights();
      // plugin.state.data.build().to(refs.structure).delete('h-sel').commit();
      return ;
    }

    // console.log("Refs",refs);

    const params = props.entityId ? {entityId: props.entityId} : {chain: props.chain};
    const sel = selectRange({... params, ...{start: props.posToHighlight, end: props.posToHighlight}});
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });

    // console.time("molstar")
    // const expression = MS.struct.generator.atomGroups({
    //   'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_entity_id(), props.entityId.toString()]),
    //   'residue-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_seq_id(), props.posToHighlight]),
    // });
    // const selection = plugin.state.data.build().to(refs.structure)
    //   .applyOrUpdate('h-sel', StateTransforms.Model.StructureSelectionFromExpression, { expression:  expression})
    //   .applyOrUpdate('h-sel-repr',
    //     StateTransforms.Representation.StructureRepresentation3D,
    //     createStructureRepresentationParams(plugin, refs.structure.data, {type: 'ball-and-stick'})
    //   ).commit();
    // console.timeEnd("molstar")
  }, [props.posToHighlight]);

  useEffect(() => {

    if (props.posToSelect === null || plugin === null || plugin.managers.structure.hierarchy.current.structures.length === 0) return;

    const params = props.entityId ? {entityId: props.entityId} : {chain: props.chain};
    const sel = selectPositions({... params, ...{positions: [props.posToSelect]}});
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.structure.focus.setFromLoci(loci);
    plugin.managers.camera.focusLoci(loci);

  }, [props.posToSelect]);

  const resetAnnotations = async () => {
    const builder  = plugin.build();
    builder.delete('mutations');
    const params = props.entityId ? {entityId: props.entityId} : {chain: props.chain};
    builder.to(refs.cartoonRepr).apply(StateTransforms.Representation.OverpaintStructureRepresentation3DFromBundle, {
      layers: [{
        bundle: Bundle.fromSelection(selectRange({...params, ...{entityId: props.entityId, start: props.start, end: props.end}})),
        color: Color(str2Hex(mappingColorSheme.emptyColor))
      }]
    });
    await builder.commit();
  }

  const color = async () => {

    if (!props.colorings || !plugin || !(props.entityId || props.chain) ) return ;

    await resetAnnotations();

    for (const coloring of props.colorings){
      if (coloring.type === structureHighlightType.other) {

        const params = [];
        for (const color in coloring.colors.colorPos) {
          str2Hex(mappingColorSheme.emptyColor)
          const positions = coloring.colors.colorPos[color];
          const _params = props.entityId ? {entityId: props.entityId} : {chain: props.chain};
          const sel = selectPositions({..._params, ...{positions: positions}})
          const bundle = Bundle.fromSelection(sel);
  
          params.push({
            bundle: bundle,
            color: Color(color),
            clear: false
          });
        }
  
        await plugin.build()
          .to(refs.cartoonRepr).apply(StateTransforms.Representation.OverpaintStructureRepresentation3DFromBundle, { layers: params})
          .commit();
      } else if (coloring.type === structureHighlightType.mutation) {
        const builder = plugin.state.data.build();
        builder.delete('mutations')
        const group = builder.to(refs.structure).apply(StateTransforms.Misc.CreateGroup, {label: 'mutations'}, {ref: 'mutations'});
        for (const color in coloring.colors.colorPos) {
          const positions = coloring.colors.colorPos[color];
          const chainTest = props.entityId ?
            [MS.struct.atomProperty.macromolecular.label_entity_id(), props.entityId.toString()] :
            [MS.struct.atomProperty.macromolecular.label_asym_id(), props.chain]
          const expression = MS.struct.generator.atomGroups({
            'chain-test': MS.core.rel.eq(chainTest),
            'residue-test': MS.core.set.has([MS.set(...positions), MS.struct.atomProperty.macromolecular.label_seq_id()]),
            'atom-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_atom_id(), 'CA'])
          });
          group
            .apply(StateTransforms.Model.StructureSelectionFromExpression, {expression: expression})
            .apply(StateTransforms.Representation.StructureRepresentation3D,
              createStructureRepresentationParams(plugin, refs.structure.data, {
                type: 'ball-and-stick',
                color: 'uniform', colorParams: {value: Color(color)},
                size: 'uniform', sizeParams: {value: 10}
              })
            )
        }
        await builder.commit();
  
      } else {
        console.warn("Unknown  highlight type");
      }
    }
  }

  useEffect(() => {
    if (!refs.cartoonRepr) return;
    (async function(){
      await color();
    })();
  }, [refs.cartoonRepr, props.colorings])

  function getStructure(){
    return plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data;
  }

  function getChainTest(params) {
    return  params.entityId ?
      [MS.struct.atomProperty.macromolecular.label_entity_id(), params.entityId.toString()] :
      [MS.struct.atomProperty.macromolecular.label_asym_id(), params.chain]
      // [MS.struct.atomProperty.macromolecular.auth_asym_id(), params.chain]
  }

  function selectRangeExpression(params){
    return MS.struct.generator.atomGroups({
      'chain-test': MS.core.rel.eq(getChainTest(params)),
      'residue-test': MS.core.rel.inRange([MS.struct.atomProperty.macromolecular.label_seq_id(), params.start, params.end]),
      'group-by': MS.struct.atomProperty.macromolecular.residueKey()
    })
  }

  function selectRange(params) {
    return Script.getStructureSelection(selectRangeExpression(params), getStructure());
  }

  function selectPositions(params) {
    const query = MS.struct.generator.atomGroups({
      'chain-test': MS.core.rel.eq(getChainTest(params)),
      'residue-test': MS.core.set.has([MS.set(...params.positions), MS.struct.atomProperty.macromolecular.label_seq_id()]),
      'group-by': MS.struct.atomProperty.macromolecular.residueKey()
    });
    return Script.getStructureSelection(query, plugin.managers.structure.hierarchy.current.structures[0].cell.obj.data);
  }

  const legend = props.structureSource == SOURCE.AF ?    
    <div className={"col-sm-3"}>
      <div className={'molstar-legend'}>
        Model Confidence:
        <div className='molstar-legend-row'>
          <span className='molstar-legend-color molstar-legend-confidence-very-high'>&nbsp;</span>
          <span className='molstar-legend-label'>Very high (plDDT &gt; 90)</span>
        </div>
        <div className='molstar-legend-row'>
          <span className='molstar-legend-color molstar-legend-confidence-confident'>&nbsp;</span>
          <span className='molstar-legend-label'>Confident (90 &gt; plDDT &gt; 70)</span>
        </div>
        <div className='molstar-legend-row'>
          <span className='molstar-legend-color molstar-legend-confidence-low'>&nbsp;</span>
          <span className='molstar-legend-label'>Low (70 &gt; plDDT &gt; 50)</span>
        </div>
        <div className='molstar-legend-row'>
          <span className='molstar-legend-color molstar-legend-confidence-very-low'>&nbsp;</span>
          <span className='molstar-legend-label'>Very low (plDDT &lt; 50)</span>
        </div>
        <div className='molstar-legend-desc'>
          AlphaFold produces a per-residue confidence score (pLDDT) between 0 and 100. Some regions below 50 pLDDT may be unstructured in isolation.
        </div>
      </div>
    </div> :
    <></>;

  return (
    <div className={"row"}>
      <div className={"col"}>
        <div className="card w-100 MolStarWrapperCard">
          {/*<div className="card-header">*/}
          {/*  Structure*/}
          {/*</div>*/}
          <div className="card-body">
            <div className={"row"}>
              <div className={props.structureSource == SOURCE.AF ? "col-sm-9" : "col"}>
                <div className={"MolStarWrapper"} ref={wrapper}></div>
              </div>
              {legend}              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export function eachAtomicHierarchyElement(structure, { chain, residue, atom, firstAtom }) {
  const l = StructureElement.Location.create(structure);
  for (const unit of structure.units) {
    if (!Unit.isAtomic(unit)) continue;

    l.unit = unit;

    const { elements } = unit;
    const chainsIt = Segmentation.transientSegments(unit.model.atomicHierarchy.chainAtomSegments, elements);
    const residuesIt = Segmentation.transientSegments(unit.model.atomicHierarchy.residueAtomSegments, elements);

    while (chainsIt.hasNext) {
      const chainSegment = chainsIt.move();

      if (chain) {
        l.element = elements[chainSegment.start];
        chain(l);
      }

      if (!residue && !atom && !firstAtom) continue;

      residuesIt.setSegment(chainSegment);
      while (residuesIt.hasNext) {
        const residueSegment = residuesIt.move();

        if (residue) {
          l.element = elements[residueSegment.start];
          residue(l);
        }

        if (!atom && !firstAtom) continue;

        for (let j = residueSegment.start, _j = residueSegment.end; j < _j; j++) {
          l.element = elements[j];
          if (atom) atom(l);
          if (firstAtom) {
            firstAtom(l);
            break;
          }
        }
      }
    }
  }
}