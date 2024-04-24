/* eslint-disable */
// @ts-nocheck
// This file was generated by lezer-generator. You probably shouldn't edit it.
import {LRParser} from "@lezer/lr"
import {labelValue, labelContext} from "./query.tokens.ts"
import {queryHighlighting} from "./query.highlight.js"
const spec_SimpleString = {__proto__:null,tag:24, template:26, setting:28, field:30, OR:130, templateId:38, cardId:40, noteId:42, settingId:44, state:46, normal:48, buried:50, userBuried:52, schedulerBuried:54, suspended:56, kind:58, due:60, true:62, false:64, reps:70, lapses:72, note:74, card:76, created:78, edited:80, reviewed:82, firstReviewed:84, again:88, hard:90, good:92, easy:94}
export const parser = LRParser.deserialize({
  version: 14,
  states: "6bQVQQOOOOQO'#Dh'#DhO!yQQO'#DhO&gQQO'#CfO'VQQO'#CgO'^QQO'#CgOOQO'#Cg'#CgO'lQQO'#DgO(VQQO'#DgOOQO'#D^'#D^QVQQOOO(aQQO'#DkO(aQQO'#DkO(aQQO'#DqO(iQQO'#DwO(}QQO'#D|O(iQQO'#D}O)cQQO'#D}O(}QQO'#EOO(aQQO'#CgO(aQQO'#CgOOQO,5:S,5:SO)hQQO,59QO)mQQO,59RO)tQQO,59RO*OQQO,59RO(aQQO,59RO(aQQO,59ROOQO,59R,59RO&tQQO,59ROOQO'#Ds'#DsO'aQQO,59ROOQP'#Cn'#CnOOQO'#Dc'#DcO*^QQO'#DcO*kQQO,5:RO*kQQO,5:ROOQO-E7[-E7[OOQP'#Cl'#ClOOQO,5:V,5:VO+UQQO,5:VOOQO,5:],5:]O+gQQO'#ClOOQO'#C}'#C}O+xQQO,5:cO,WQQO,5:cO,]QQO,5:hO,bQQO,5:iO,jQQO,5:iO,oQQO,5:iO,wQQO,5:jO-eQQO,59RO-lQRO,59ROOQO1G.l1G.lO-tQQO,59RO&tQQO,59RO/jQQO1G.mO)mQQO1G.mO*OQQO1G.mO(aQQO1G.mO(aQQO1G.mO0TQQO,59RO'aQQO,59RO1vQQO1G.mO1}QRO1G.mOOQO1G.m1G.mOOQO,59},59}OOQO-E7a-E7aO2VQQO1G/mOOQO'#Cm'#CmO2pQQO'#CmO2{QQO'#CmO(aQQO1G/qOOQO1G/}1G/}O3ZQQO1G/}OOQO1G0S1G0SOOQO1G0T1G0TO3`QQO1G0TO(iQQO1G0TO3eQQO1G0UO5gQQO1G0UOOQO'#Du'#DuO-SQQO1G.mO5lQRO1G.mOOQO'#D_'#D_O5qQQO'#D_O5xQQO,5:YO6YQQO'#DnO&tQQO'#DnO6jQQO1G.mOOQO7+$X7+$XO8`QQO7+$XO1vQQO7+$XO1}QRO7+$XOOQO'#D`'#D`O8eQQO'#D`O8sQQO,5:^O8zQQO'#DrO'aQQO'#DrO9cQQO1G.mO;UQQO1G.mO-SQQO1G.mO=ZQRO1G.mO?aQRO1G.mOOQO,59X,59XO?fQQO,59XOOQO7+%]7+%]OOQO7+%i7+%iOOQO7+%o7+%oO?qQQO7+%oO?yQQO7+%oO@OQSO7+%pO@aQQO7+%pOOQO,59y,59yOOQO-E7]-E7]OBcQQO,5:YOBsQQO1G/tOOQO<<Gs<<GsOCTQQO<<GsOOQO,59z,59zOOQO-E7^-E7^OCYQQO,5:^OCqQQO1G/xOOQO'#Da'#DaOCxQQO'#DaODPQQO,5:`ODaQQO'#DtO-SQQO'#DtODqQQO7+$XOOQP'#Db'#DbOFvQRO'#DbOGOQRO,5:bOGaQRO'#DvOGrQRO'#DvOGwQRO7+$XOOQO1G.s1G.sOOQO<<IZ<<IZOIpQQO<<IZOOQO<<I[<<I[OIuQSO<<I[OOQOAN=_AN=_OOQO,59{,59{OOQO-E7_-E7_OJWQQO,5:`OJhQQO1G/zOOQP,59|,59|OOQP-E7`-E7`OJxQRO,5:bOKZQRO1G/|OOQOAN>uAN>uOOQOAN>vAN>vOKlQQO'#DgOLVQQO,5:ROLVQQO,5:ROLpQQO1G/mOBcQQO,5:YOCYQQO,5:^OMZQQO1G/tOMkQQO1G/xOJWQQO,5:`OJxQRO,5:bONSQQO1G/zONdQRO1G/|O(VQQO'#Dg",
  stateData: "N|~O!YOS~ORWOSPOTQOUQOVQOWQO[ZO]ZO^ZO_[Oc]Od]Oe]Of]OgcOmdOn^Os_Ot_OuaOvaOw`Ox`OybOzbO!]RO~OXeOR![XS![XT![XU![XV![XW![X[![X]![X^![X_![Xc![Xd![Xe![Xf![Xg![Xm![Xn![Xs![Xt![Xu![Xv![Xw![Xx![Xy![Xz![X!W![X!]![X!c![X!d![X!^![X~OSPOTQOUQOVQOWQO[ZO]ZO^ZO_[Oc]Od]Oe]Of]On^Os_Ot_OuaOvaOw`Ox`OybOzbO!]RO~ORhOgjOmkO~P$|OSPOTQOUQOVQOWQO~ORmO~P&tORoOTnOUnOVnO~OR$iOgcOmdO!cpO!dpO!W!ZX!^!ZX~P$|OgcOmdO~P$|O!`vO!avO~O!`zO!azO!l{O!m{O!n{O!o{O~O!`{O!a{O!l{O!m{O!n{O!o{O~O!`!RO~O!^!VO~OR!XO~P&tOg!]Om!^O~P$|OR!`OTnOUnOVnO~OR$iOgcOmdO~P$|OR$iOgcOmdO!cpO!dpO!W!Za!^!Za~P$|OR!iOS!gOT!hOU!hOV!hO~OR`XV`Xo`Xp`XrqX~OR!lOV!kOo!kOp!kO~Or!kO~OV!mO~OR!oOV!nO~Or!nO~Ow!pOx!pO~OR!rOV!qOr!qO~Oh!sOi!sOj!sOk!sOl!sO~OR!tO~P-SOP!cOR!uO~OR!zO!cpO!dpO[Za]Za^Za_ZacZadZaeZafZagZamZanZasZatZauZavZawZaxZayZazZa!]Za!^!bX!cZa!dZa~P&tO!^!|O~OR#UOTnOUnOVnO!cpO!dpO~OSZaWZa[Za]Za^Za_ZacZadZaeZafZagZamZanZasZatZauZavZawZaxZayZazZa!]Za!^!fX!cZa!dZa~P/oOR#XO~P-SOP#YOR#ZO~OR$iOgcOmdO!cpO!dpO!W!Zi!^!Zi~P$|OX#[O!`aX!aaX~OS#[OT#]OU#]OV#]O~OV#_O~OV#`O~OR!riS!riT!riU!riV!riW!ri[!ri]!ri^!ri_!ric!rid!rie!rif!rig!rim!rin!ris!rit!riu!riv!riw!rix!riy!riz!ri!W!ri!]!ri!c!ri!d!ri!^!ri~P(}OV#dO~OP!|O~OR!zO~P&tOR!zO!cpO!dpO!^!ba~P&tOR!zO!^!bX!c!bX!d!bX~P&tOR!zO!cpO!dpO[Zi]Zi^Zi_ZicZidZieZifZigZimZinZisZitZiuZivZiwZixZiyZizZi!]Zi!^!ba!cZi!dZi~P&tO!^#iO~OR#UOTnOUnOVnO~O!^!fa~P/oOR#UOTnOUnOVnO!^!fX!c!fX!d!fX~OSZiWZi[Zi]Zi^Zi_ZicZidZieZifZigZimZinZisZitZiuZivZiwZixZiyZizZi!]Zi!^!fa!cZi!dZi~P/oOR#sO!cpO!dpOSZiTZiUZiVZiWZi[Zi]Zi^Zi_ZicZidZieZifZigZimZinZisZitZiuZivZiwZixZiyZizZi!]Zi!^!hX!cZi!dZi~P-SOP#xOR#yO!cpO!dpOSZiTZiUZiVZiWZi[Zi]Zi^Zi_ZicZidZieZifZigZimZinZisZitZiuZivZiwZixZiyZizZi!]Zi!^!jX!cZi!dZi~OP#zO~OX#{O!`aa!aaa~OR#}OV#|O~Or#|O~O{$OO|$OO}$OO!O$OO!P$OO~OR!rqS!rqT!rqU!rqV!rqW!rq[!rq]!rq^!rq_!rqc!rqd!rqe!rqf!rqg!rqm!rqn!rqs!rqt!rqu!rqv!rqw!rqx!rqy!rqz!rq!W!rq!]!rq!c!rq!d!rq!^!rq~P(}OR!zO!^!ba!c!ba!d!ba~P&tOR!zO!cpO!dpO!^!bi~P&tO!^$QO~OR#UOTnOUnOVnO!^!fa!c!fa!d!fa~O!^!fi~P/oOR#sO~P-SOR#sO!cpO!dpO!^!ha~P-SOR#sO!^!hX!c!hX!d!hX~P-SOR#sO!cpO!dpOSZqTZqUZqVZqWZq[Zq]Zq^Zq_ZqcZqdZqeZqfZqgZqmZqnZqsZqtZquZqvZqwZqxZqyZqzZq!]Zq!^!ha!cZq!dZq~P-SOP#xOR#yO~OP#xOR#yO!cpO!dpO!^!ja~OP#xOR#yO!^!jX!c!jX!d!jX~OP$XO~OSZqTZqUZqVZqWZq[Zq]Zq^Zq_ZqcZqdZqeZqfZqgZqmZqnZqsZqtZquZqvZqwZqxZqyZqzZq!]Zq!cZq!dZq~PGOOV$ZO~O{$[O|$[O}$[O!O$[O!P$[O~OR#sO!^!ha!c!ha!d!ha~P-SOR#sO!cpO!dpO!^!hi~P-SOP#xOR#yO!^!ja!c!ja!d!ja~OP#xOR#yO!cpO!dpO!^!ji~OR$iOgcOmdO!W!ZX!c!ZX!d!ZX!^!ZX~P$|OR$iOgcOmdO!W!Za!c!Za!d!Za!^!Za~P$|OR$iOgcOmdO!W!Zi!c!Zi!d!Zi!^!Zi~P$|OR!zO!^!bi!c!bi!d!bi~P&tOR#UOTnOUnOVnO!^!fi!c!fi!d!fi~OR#sO!^!hi!c!hi!d!hi~P-SOP#xOR#yO!^!ji!c!ji!d!ji~Or{VRTR~",
  goto: "-P!sPPPPPPPPPP!t!tPPPP#]$U$XPPPPPPPPPPPPPP$wPPPPPPPPPPPPPP%^%d%v&Y&l'OPPP'b'vPP(zPP)aPP)t*Z*n+Z+n,Z,nPPPP,n,n,nUVORYStWhb$]Vrst!f$]$^$_$`R$_$iQwZQx[Qy]Q|^Q!P`Q!TcQ!UdQ!ajQ!bkQ#O!]Q#P!^Q#^!jR#a!pR!jxWrVst!fW!w!W!x!{#hW#R!_#S#V#nW#p#W#q#t$UX#v#Y#w#z$YQ}^Q!O_Q!Q`Q!SbQ#b!pQ#c!qR$P#dQYORuYQ!x!WW#f!x#h$a$cQ#h!{Q$a!yR$c#gQ#S!_W#l#S#n$b$dQ#n#VQ$b#TR$d#mQ#q#WW$S#q$U$e$gQ$U#tQ$e#rR$g$TQ#w#YW$W#w$Y$f$hQ$Y#zQ$f#xR$h$XQsVW!es!f$^$`Q!ftQ$^$]R$`$_SXOYQfR`qVst!f$]$^$_$`R!drUVORYQlSStWhS!Wg!ZQ!cmb!y!W!w!x!y!{#g#h$a$cQ!{!XQ#g!zb$]Vrst!f$]$^$_$`R$_$ijSOVWYrst!f$]$^$_$`$iQgRR!ZhQ!Yg`!v!W!x!y!{#g#h$a$cQ!}!ZR#e!wjTOVWYrst!f$]$^$_$`$iQiRR![hQ!YiQ!}![`#Q!_#S#T#V#m#n$b$dR#k#RQlTS!_i![Q!cob#T!_#R#S#T#V#m#n$b$dQ#V!`R#m#UQ!}!aQ#j#O`#o#W#q#r#t$T$U$e$gR$R#pQ!c!TQ!|!tS#W!a#Ob#r#W#p#q#r#t$T$U$e$gQ#t#XR$T#sQ!}!bQ#j#P`#u#Y#w#x#z$X$Y$f$hR$V#voUORVWYhrst!f$]$^$_$`$i",
  nodeNames: "⚠ KindValue Program Not Regex SimpleString QuotedString Number Html Wildcard Group Label tag template setting field Is FieldName Or templateId cardId noteId settingId state normal buried userBuried schedulerBuried suspended kind due true false Comparison Date reps lapses note card created edited reviewed firstReviewed Rating again hard good easy",
  maxTerm: 80,
  context: labelContext,
  nodeProps: [
    ["isolate", 4,""]
  ],
  propSources: [queryHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 6,
  tokenData: "Ad~R!QOX$XX^%u^p$Xpq%uqr$Xrs&jsx$Xxy'hyz'mz{'r{|$X|}'w}!O'|!O!P$X!P!Q)f!Q!R,t!R!S=i!S!T=i!T!U=i!U!V=i!V![,t![!]?T!]!^$X!^!_?Y!_!`?g!`!a?l!a#O$X#P#S$X#S#T?y#T#y$X#y#z%u#z$f$X$f$g%u$g#BY$X#BY#BZ%u#BZ$IS$X$IS$I_%u$I_$I|$X$I|$JO%u$JO$JT$X$JT$JU%u$JU$KV$X$KV$KW%u$KW&FU$X&FU&FV%u&FV;'S$X;'S;=`%o<%lO$X~$^eT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![$X!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~%rP;=`<%l$X~%zY!Y~X^%upq%u#y#z%u$f$g%u#BY#BZ%u$IS$I_%u$I|$JO%u$JT$JU%u$KV$KW%u&FU&FV%u~&mVOr&jrs'Ss#O&j#O#P'X#P;'S&j;'S;=`'b<%lO&j~'XOU~~'[Qrs&j#O#P&j~'eP;=`<%l&j~'mO!]~~'rO!^~~'wOX~~'|O!d~~(TeR~T~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![$X!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~)iWOY*RZ!P*R!Q!}*R!}#O+`#O#P,_#P;'S*R;'S;=`,n<%lO*R~*UXOY*RZ!P*R!P!Q*q!Q!}*R!}#O+`#O#P,_#P;'S*R;'S;=`,n<%lO*R~*vWS~#W#X*q#Z#[*q#]#^*q#a#b*q#g#h*q#i#j*q#j#k*q#m#n*q~+cVOY+`Z#O+`#O#P+x#P#Q*R#Q;'S+`;'S;=`,X<%lO+`~+{SOY+`Z;'S+`;'S;=`,X<%lO+`~,[P;=`<%l+`~,bSOY*RZ;'S*R;'S;=`,n<%lO*R~,qP;=`<%l*R~,{eVPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![.^!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~.eeVPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![/v!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~/}eVPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![1`!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~1gfVPT~OX$X^p$Xqr$Xsx$X{|$X}!O2{!O!P$X!Q![<P!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~3QeT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![4c!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~4hfT~OX$X^p$Xqr$Xsx$X{|$X}!O5|!O!P$X!Q![:f!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~6ReT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![7d!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~7kerPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![8|!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~9TerPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![$X!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~:kfT~OX$X^p$Xqr$Xsx$X{|$X}!O5|!O!P$X!Q![$X!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~<WeVPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![<P!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~=re{QVPT~OX$X^p$Xqr$Xsx$X{|$X}!P$X!Q![.^!]!^$X!a#O$X#P#S$X#T#y$X#z$f$X$g#BY$X#BZ$IS$X$I_$I|$X$JO$JT$X$JU$KV$X$KW&FU$X&FV;'S$X;'S;=`%o<%lO$X~?YO!`~~?_P!l~!_!`?b~?gO!n~~?lO!a~~?qP!m~!_!`?t~?yO!o~~?|WOr?ys#O?y#O#P@f#P#S?y#S#T@o#T;'S?y;'S;=`A^<%lO?y~@iQrs?y#O#P?y~@tWW~Or?ys#O?y#O#P@f#P#S?y#S#T@o#T;'S?y;'S;=`A^<%lO?y~AaP;=`<%l?y",
  tokenizers: [labelValue, 0, 1],
  topRules: {"Program":[0,2]},
  dynamicPrecedences: {"64":1,"68":2,"70":3,"72":3},
  specialized: [{term: 5, get: (value: keyof typeof spec_SimpleString) => spec_SimpleString[value] || -1}],
  tokenPrec: 2107
})
