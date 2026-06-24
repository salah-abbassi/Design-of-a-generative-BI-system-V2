\LoadClass[a4paper,12pt]{report} % Classe du document

%--------------------- Packages ------------------------


\RequirePackage{titlesec} % For customizing chapter and section titles
\RequirePackage{tocloft} % For customizing the table of contents


\RequirePackage[french]{babel} % Langue du document
\RequirePackage[utf8]{inputenc} % Caractères spéciaux
\RequirePackage[section]{placeins} % Pour placement de section
\RequirePackage[T1]{fontenc} % Quelques lettres qui sont pas inclus dans UTF-8
\RequirePackage{mathtools} % Paquet pour des équations et symboles mathématiques
\RequirePackage{siunitx} % Pour écrire avec la notation scientifique (Ex.: \num{2e+9})
\RequirePackage{float} % Pour placement d'images
\RequirePackage{graphicx} % Paquet pour insérer des images
\RequirePackage[justification=centering]{caption} % Pour les légendes centralisées
\RequirePackage{subcaption}
\RequirePackage{wallpaper}
\RequirePackage{nomencl}
%\makenomenclature
\RequirePackage{fancyhdr}
\RequirePackage{fancybox}
\RequirePackage{url}
\RequirePackage[hidelinks]{hyperref}%Paquet pour insérer légendes dans des sous-figures comme Figure 1a, 1b
\RequirePackage[left=2.25cm,right=2.25cm,top=2cm,bottom=3cm]{geometry} % Configuration de la page

% Customize chapter titles to match book document class
\titleformat{\chapter}[display]
  {\normalfont\huge\bfseries}{\chaptertitlename\ \thechapter}{20pt}{\Huge}
\titlespacing*{\chapter}
  {0pt}{-10pt}{10pt}

  
% Customize section titles to match book document class
\titleformat{\section}
  {\normalfont\Large\bfseries}{\thesection}{1em}{}
%-------------------- Informations sur le rapport ----------------------

\newcommand{\UE}[1]{\renewcommand{\UE}{#1}}
\newcommand{\sujet}[1]{\renewcommand{\sujet}{#1}}
\newcommand{\titre}[1]{\renewcommand{\titre}{#1}}
\newcommand{\enseignant}[1]{\renewcommand{\enseignant}{#1}}
\newcommand{\eleves}[1]{\renewcommand{\eleves}{#1}}
\newcommand{\jury}[1]{\renewcommand{\jury}{#1}}


\newcommand{\fairemarges}{
    \fancyhf{} %Clear Everything.
    \fancyheadoffset{1cm}
    \setlength{\headheight}{1.5cm}
    \fancyfoot[C]{\thepage} %Page Number
    \renewcommand{\headrulewidth}{1pt} %0pt for no rule, 2pt thicker etc...
    \renewcommand{\footrulewidth}{1pt}
    \fancyfoot[L]{\large \textcolor{blue}{S}mart\textcolor{red}{B}I} % BOTTOM LEFT
    \fancyfoot[R]{\large 20\textcolor{red}{25}-20\textcolor{blue}{26}} % BOTTOM RIGHT
    \fancyhead[L]{\large \nouppercase{\leftmark}} % TOP LEFT
    \fancyhead[R]{\includegraphics[width=0.07\textwidth]{logos/ensiasprisme.png}} % TOP RIGHT
    \pagestyle{fancy}
}

\newcommand{\fairepagedegarde}{
\begin{titlepage}

\ThisLRCornerWallPaper{1}{logos/background.png}
	
    %\vspace{-2cm}
    %\includegraphics[width=0.2\textwidth]{logos/um5logo.png}
    %\hfill
    \centering %Centraliser le contenu
    %\hspace{-2cm}
    \includegraphics[width=0.27\textwidth]{logos/ensias.png}\hfill
	\includegraphics[width=0.27\textwidth]{logos/um5logo.png}\par\vspace{1.5cm} %Insertion du logo
	{\textbf{\scshape\Large \textcolor{red}{É}cole \textcolor{red}{N}ationale \textcolor{red}{S}upérieure d'\textcolor{red}{I}nformatique
et d'\textcolor{red}{A}nalyse des \textcolor{red}{S}ystèmes}}\\
        \textbf{\large \textcolor{blue}{U}niversité \textcolor{blue}{M}ohammed \textcolor{blue}{V} \par} %Nom de l'université
	\vspace{1.5cm}%Espace de 1,5cm
	\Large \textbf{\Huge\bfseries \textcolor{red}{R}apport \textcolor{red}{d}e  \textcolor{red}{p}rojet \textcolor{red}{d}e  \textcolor{red}{f}in  d'\textcolor{red}{a}nnée\\ }%sous-titre
	\vspace{0.7cm}%Espace de 1cm
  \Large \textbf{\textcolor{blue}{B}usiness \textcolor{blue}{I}ntelligence \textcolor{blue}{\&} \textcolor{blue}{A}nalytics} \vspace{0.8cm}
  
  \rule{\linewidth}{0.2 mm} \par 
	{\huge\bfseries \titre \par}
  \rule{\linewidth}{0.2 mm} \par 
  \vspace{1cm}
	\begin{minipage}{0.5\textwidth} % Minipage pour faire deux colonnes
            \begin{flushleft} \large % Envoyer à gauche
              \textbf{\textcolor{red}{É}lèves    }\par
              \vspace{0.2cm}
            \eleves\par % Remplacer pour chacun
            \end{flushleft}
        \end{minipage}
        ~
        \begin{minipage}{0.4\textwidth}
            \begin{flushright} \large
              \textbf{\textcolor{red}{E}ncadrant } \par
            \vspace{0.2cm}
             \enseignant \par
            \end{flushright}
        \end{minipage}
        \vspace{1cm}
        
        \vfill
        {\large Année Universitaire 20\textcolor{red}{25}-20\textcolor{red}{26}\par}

\end{titlepage}
}

\newcommand{\tabledematieres}{
\tableofcontents
\newpage
}

\newcommand{\insererfigure}[4]{

}



